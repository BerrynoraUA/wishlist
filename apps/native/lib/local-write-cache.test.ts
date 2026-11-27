import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { applyLocalWrite, discardLocalWrite, findLocalRecord } from "./local-write-cache";
import type { QueuedWrite } from "./write-queue";

const client = new QueryClient();
afterEach(() => client.clear());
function write(overrides: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    userId: "me",
    entity: "wishlist",
    action: "create",
    id: "new",
    payload: {},
    local: { id: "new", title: "Offline", user_id: "me", items_count: 0 },
    ...overrides,
  };
}

describe("local queued records", () => {
  it("inserts once on the first page and leaves another account untouched", () => {
    const data = { pages: [[], [{ id: "old" }]], pageParams: [0, 1] };
    client.setQueryData(["wishlists", "my", "me"], data);
    client.setQueryData(["wishlists", "my", "other"], data);
    applyLocalWrite(client, write());
    applyLocalWrite(client, write());
    expect(client.getQueryData(["wishlists", "my", "me"])).toMatchObject({
      pages: [[{ id: "new" }], [{ id: "old" }]],
    });
    expect(client.getQueryData(["wishlists", "my", "other"])).toEqual(data);
  });

  it("adds a wish to a wishlist created offline, seeds its item list, and updates counts once", () => {
    client.setQueryData(["statistics", "my", "me"], { wishlists_count: 0, total_items_count: 0 });
    applyLocalWrite(client, write());
    const child = write({
      entity: "item",
      id: "wish",
      local: { id: "wish", wishlist_id: "new", name: "Gift" },
    });
    applyLocalWrite(client, child);
    applyLocalWrite(client, child);
    expect(client.getQueryData(["wishlists", "detail", "new", "me"])).toMatchObject({
      items_count: 1,
    });
    expect(client.getQueryData(["statistics", "my", "me"])).toEqual({
      wishlists_count: 1,
      total_items_count: 1,
    });
    expect(
      client.getQueriesData({ queryKey: ["items", "wishlist", "me", "new"] })[0][1],
    ).toMatchObject({ pages: [[{ name: "Gift" }]] });
  });

  it("removes a deleted record from every loaded page and detail", () => {
    client.setQueryData(["wishlists", "my", "me"], {
      pages: [[], [{ id: "new" }]],
      pageParams: [0, 1],
    });
    client.setQueryData(["wishlists", "detail", "new", "me"], { id: "new" });
    applyLocalWrite(client, write({ action: "delete", local: undefined }));
    expect(client.getQueryData(["wishlists", "my", "me"])).toMatchObject({ pages: [[], []] });
    expect(client.getQueryData(["wishlists", "detail", "new", "me"])).toBeNull();
  });

  it("keeps Secret Santa response pagination while adding the event and detail", () => {
    client.setQueryData(["secret-santa", "list", "me"], {
      pages: [{ items: [], total: 0, offset: 0, limit: 12 }],
      pageParams: [0],
    });
    applyLocalWrite(client, write({ entity: "event", local: { id: "new", name: "Party" } }));
    expect(client.getQueryData(["secret-santa", "list", "me"])).toMatchObject({
      pages: [{ items: [{ name: "Party" }], total: 1, limit: 12 }],
    });
    expect(client.getQueryData(["secret-santa", "detail", "me", "new"])).toEqual({
      id: "new",
      name: "Party",
    });
  });

  it("restores selected group members from saved friend profiles", () => {
    client.setQueryData(["friends", "list", "me"], {
      pages: [
        [{ friend_id: "friend", display_name: "Alex", nickname: "alex", avatar_url: "photo" }],
      ],
      pageParams: [0],
    });
    applyLocalWrite(client, write({ entity: "group", payload: { memberIds: ["friend"] } }));
    expect(client.getQueryData(["friends", "groups", "members", "me", "new"])).toEqual([
      { id: "friend", display_name: "Alex", nickname: "alex", avatar_url: "photo" },
    ]);
  });

  it("keeps selected access editable before the wishlist reaches the server", () => {
    const grant = write({
      entity: "access",
      action: "update",
      payload: { targetId: "friend", accessType: 3 },
      local: undefined,
    });
    applyLocalWrite(client, grant);
    applyLocalWrite(client, grant);
    expect(client.getQueryData(["wishlist-access-list", "me", "new"])).toMatchObject([
      { id: "friend", access_type: 3 },
    ]);
    applyLocalWrite(client, { ...grant, action: "delete" });
    expect(client.getQueryData(["wishlist-access-list", "me", "new"])).toEqual([]);
  });

  it("discards a rejected create or restores the prior edit without needing a connection", () => {
    const entry = write();
    applyLocalWrite(client, entry);
    discardLocalWrite(client, entry);
    expect(client.getQueryData(["wishlists", "detail", "new", "me"])).toBeNull();
    applyLocalWrite(client, entry);
    discardLocalWrite(client, {
      ...entry,
      action: "update",
      previous: { ...(entry.local as object), title: "Original" },
    });
    expect(client.getQueryData(["wishlists", "detail", "new", "me"])).toMatchObject({
      title: "Original",
    });
  });

  it("restores a discarded deletion to its saved list while still offline", () => {
    const entry = write();
    applyLocalWrite(client, entry);
    const deletion = {
      ...entry,
      action: "delete" as const,
      local: undefined,
      previous: entry.local,
    };
    applyLocalWrite(client, deletion);
    discardLocalWrite(client, deletion);
    expect(client.getQueriesData({ queryKey: ["wishlists", "my", "me"] })[0][1]).toMatchObject({
      pages: [[{ id: "new", title: "Offline" }]],
    });
  });

  it("keeps event participants when preparing a deletion rollback", () => {
    client.setQueryData(["secret-santa", "list", "me"], {
      pages: [{ items: [{ id: "event", name: "Party" }], total: 1 }],
      pageParams: [0],
    });
    const details = {
      id: "event",
      name: "Party",
      participants: [{ id: "friend" }],
      pending_invites: [],
    };
    client.setQueryData(["secret-santa", "detail", "me", "event"], details);
    expect(findLocalRecord(client, "event", "event")).toEqual(details);
  });
});
