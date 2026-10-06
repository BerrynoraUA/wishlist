import { describe, expect, it, vi } from "vitest";
import type { WishlistSupabaseClient } from "../supabase/types";
import { createNotifier } from "./notifier";

type Rows = Record<string, unknown>[];

/** A Supabase stand-in that serves fixed table rows and records every RPC. */
function fakeClient(options: {
  tables?: Record<string, Rows>;
  locales?: Record<string, string>;
  failRpc?: string;
  failTable?: string;
}) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === options.failRpc) return { data: null, error: new Error(`${name} failed`) };
    if (name === "get_preferred_locales")
      return {
        data: (args.p_user_ids as string[]).map((user_id) => ({
          user_id,
          preferred_locale: options.locales?.[user_id] ?? null,
        })),
        error: null,
      };
    return { data: null, error: null };
  });
  const filters: { table: string; column: string; value: unknown }[] = [];
  const from = (table: string) => {
    let rows = options.tables?.[table] ?? [];
    const failed = table === options.failTable;
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push({ table, column, value });
        rows = rows.filter((row) => row[column] === value);
        return query;
      },
      in: (column: string, values: unknown[]) => {
        filters.push({ table, column, value: values });
        rows = rows.filter((row) => values.includes(row[column]));
        return query;
      },
      single: async () =>
        failed
          ? { data: null, error: new Error(`${table} failed`) }
          : { data: rows[0] ?? null, error: rows[0] ? null : new Error("No rows") },
      // Deliberately thenable: PostgREST builders are awaited without a terminal call.
      // oxlint-disable-next-line no-thenable
      then: (resolve: (value: { data: Rows | null; error: Error | null }) => unknown) =>
        resolve(
          failed
            ? { data: null, error: new Error(`${table} failed`) }
            : { data: rows, error: null },
        ),
    };
    return query;
  };
  const auth = {
    getUser: async () => ({
      data: { user: { email: "organizer@example.com", user_metadata: {} } },
    }),
  };
  const client = { rpc, from, auth } as unknown as WishlistSupabaseClient;
  const notifications = () =>
    rpc.mock.calls.filter(([name]) => name === "create_notification").map(([, args]) => args);
  return { client, rpc, filters, notifications };
}

const EVENT = "event-1";

describe("Secret Santa notifications", () => {
  it("notifies each invitee with their own invite id, in their language", async () => {
    const { client, filters, notifications } = fakeClient({
      tables: {
        secret_santa_invites: [
          { id: "invite-a", event_id: EVENT, receiver_id: "alice" },
          { id: "invite-b", event_id: EVENT, receiver_id: "bob" },
          { id: "invite-other", event_id: "other-event", receiver_id: "alice" },
        ],
      },
      locales: { bob: "uk" },
    });
    const log = vi.fn();
    await createNotifier(client, { log }).notifySecretSantaInvites(EVENT, "Office party", [
      "alice",
      "bob",
    ]);

    expect(filters).toEqual([
      { table: "secret_santa_invites", column: "event_id", value: EVENT },
      { table: "secret_santa_invites", column: "receiver_id", value: ["alice", "bob"] },
    ]);
    expect(notifications()).toEqual([
      {
        p_receiver_id: "alice",
        p_type: 0,
        p_icon_type: 0,
        p_text: 'You have been invited to Secret Santa "Office party"',
        p_entity_id: "invite-a",
      },
      {
        p_receiver_id: "bob",
        p_type: 0,
        p_icon_type: 0,
        p_text: 'Вас запросили до Secret Santa "Office party"',
        p_entity_id: "invite-b",
      },
    ]);
    expect(log).not.toHaveBeenCalled();
  });

  it("sends nothing and reads nothing when nobody was invited", async () => {
    const { client, rpc, filters } = fakeClient({});
    await createNotifier(client, { log: vi.fn() }).notifySecretSantaInvites(EVENT, "Party", []);
    expect(rpc).not.toHaveBeenCalled();
    expect(filters).toEqual([]);
  });

  it("tells every participant names were drawn, linking to the event", async () => {
    const { client, notifications } = fakeClient({
      tables: { secret_santa: [{ id: EVENT, name: "Family exchange" }] },
      locales: { carol: "de" },
    });
    await createNotifier(client, { log: vi.fn() }).notifySecretSantaStarted(EVENT, [
      "alice",
      "carol",
    ]);

    expect(notifications()).toEqual([
      {
        p_receiver_id: "alice",
        p_type: 9,
        p_icon_type: 0,
        p_text: 'Names are drawn in Secret Santa "Family exchange"! See who you are gifting',
        p_entity_id: EVENT,
      },
      {
        p_receiver_id: "carol",
        p_type: 9,
        p_icon_type: 0,
        p_text:
          'Die Namen für Secret Santa "Family exchange" wurden gezogen! Sieh nach, wen du beschenkst',
        p_entity_id: EVENT,
      },
    ]);
  });

  it("logs instead of throwing when the event can't be read", async () => {
    const { client, notifications } = fakeClient({ failTable: "secret_santa" });
    const log = vi.fn();
    await expect(
      createNotifier(client, { log }).notifySecretSantaStarted(EVENT, ["alice"]),
    ).resolves.toBeUndefined();
    expect(notifications()).toEqual([]);
    expect(log).toHaveBeenCalledWith(
      "[notifications] failed to notify secret santa start",
      expect.any(Error),
    );
  });

  it("logs instead of throwing when writing a notification fails", async () => {
    const { client } = fakeClient({
      tables: { secret_santa: [{ id: EVENT, name: "Party" }] },
      failRpc: "create_notification",
    });
    const log = vi.fn();
    await expect(
      createNotifier(client, { log }).notifySecretSantaStarted(EVENT, ["alice"]),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      "[notifications] failed to create localized notification",
      expect.any(Error),
    );
  });
});

describe("actor name", () => {
  it("uses the session user by default and an explicit actor when given", async () => {
    const reserved = (client: WishlistSupabaseClient, actorName?: () => Promise<string>) =>
      createNotifier(client, { log: vi.fn(), actorName }).createLocalizedNotification({
        receiverId: "owner",
        key: "item_reserved",
      });

    const session = fakeClient({});
    await reserved(session.client);
    expect(session.notifications()[0].p_text).toBe("organizer@example.com reserved your item");

    const explicit = fakeClient({});
    await reserved(explicit.client, async () => "Alice");
    expect(explicit.notifications()[0].p_text).toBe("Alice reserved your item");
  });
});
