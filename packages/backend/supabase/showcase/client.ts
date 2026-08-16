/**
 * A Supabase stand-in backed entirely by `./data.ts`, used only when
 * `EXPO_PUBLIC_SHOWCASE=1`. App-store captures need one deterministic account on
 * screen, not a database — this removes Docker, the local stack and the seeding step
 * from the screenshot harness while the app keeps calling its production queries.
 *
 * Reads are answered; writes succeed without recording anything, because nothing in a
 * capture mutates and a stray mutation must not throw.
 */

import type { WishlistSupabaseClient } from "../types";
import {
  SHOWCASE_BLOCKED_USERS,
  SHOWCASE_EXCHANGE_RATES,
  SHOWCASE_FRIENDS,
  SHOWCASE_INCOMING_REQUESTS,
  SHOWCASE_ITEMS,
  SHOWCASE_NOTIFICATIONS,
  SHOWCASE_PROFILE,
  SHOWCASE_PUBLIC_PROFILES,
  SHOWCASE_SECRET_SANTA_DETAILS,
  SHOWCASE_SECRET_SANTA_LIST,
  SHOWCASE_SETTINGS,
  SHOWCASE_STATISTICS,
  SHOWCASE_SUBSCRIPTION,
  SHOWCASE_USER,
  SHOWCASE_WISHLISTS,
} from "./data";

/** Fixture rows are ordinary interfaces, so columns are read through a cast. */
type Row = object;
type Params = Record<string, unknown>;

function column(row: Row, name: string): unknown {
  return (row as Record<string, unknown>)[name];
}

const SHOWCASE_SESSION = {
  access_token: "showcase-access-token",
  refresh_token: "showcase-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: SHOWCASE_USER.id,
    aud: "authenticated",
    role: "authenticated",
    email: SHOWCASE_USER.email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: SHOWCASE_USER.displayName },
    created_at: new Date(0).toISOString(),
  },
};

function ok<T>(data: T) {
  return Promise.resolve({ data, error: null });
}

function page<T>(rows: readonly T[], params: Params, skipKey = "p_skip", takeKey = "p_take") {
  const skip = Number(params[skipKey] ?? 0);
  const take = Number(params[takeKey] ?? rows.length);
  return rows.slice(skip, skip + take);
}

/**
 * Only the RPCs the four capture scenes reach are answered by name. Anything else
 * resolves empty, which keeps an unrelated screen from erroring mid-run.
 */
const RPC_HANDLERS: Record<string, (params: Params) => unknown> = {
  get_my_wishlists_feed: (params) => page(SHOWCASE_WISHLISTS, params),
  get_wishlist_by_id: (params) =>
    SHOWCASE_WISHLISTS.find((wishlist) => wishlist.id === params.p_wishlist_id) ?? null,
  get_wishlist_items: (params) =>
    page(
      SHOWCASE_ITEMS.filter((item) => item.wishlist_id === params.p_wishlist_id),
      params,
    ),
  get_user_stats: () => [SHOWCASE_STATISTICS],
  get_friends: (params) => page(SHOWCASE_FRIENDS, params),
  get_incoming_friend_requests_with_details: (params) => page(SHOWCASE_INCOMING_REQUESTS, params),
  get_outgoing_friend_requests_with_details: () => [],
  get_friend_groups: () => [],
  get_blocked_users: () => SHOWCASE_BLOCKED_USERS,
  list_secret_santa_events: () => SHOWCASE_SECRET_SANTA_LIST,
  get_secret_santa_details: () => SHOWCASE_SECRET_SANTA_DETAILS,
  get_user_notifications: (params) => page(SHOWCASE_NOTIFICATIONS, params, "p_offset", "p_limit"),
  get_unread_notifications_count: () =>
    SHOWCASE_NOTIFICATIONS.filter((notification) => !notification.is_read).length,
};

const PROFILE_ROWS: readonly Row[] = SHOWCASE_PUBLIC_PROFILES.map((profile) =>
  profile.id === SHOWCASE_PROFILE.id
    ? SHOWCASE_PROFILE
    : { ...profile, bio: null, height: null, shoe_size: null, userGuideStep: 15 },
);

const TABLES: Record<string, readonly Row[]> = {
  profiles: PROFILE_ROWS,
  user_settings: [SHOWCASE_SETTINGS],
  user_subscriptions: [SHOWCASE_SUBSCRIPTION],
  exchange_rates: SHOWCASE_EXCHANGE_RATES,
  notifications: SHOWCASE_NOTIFICATIONS,
};

/**
 * A thenable PostgREST-shaped builder. Filters are applied on read; a write resolves
 * with its own payload so `.select().single()` after an insert still returns a row.
 */
function createQueryBuilder(table: string) {
  let rows: readonly Row[] = TABLES[table] ?? [];
  let written: Row | Row[] | null = null;

  const builder = {
    select: () => builder,
    // Ordering and range are irrelevant against a handful of fixed rows.
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    or: () => builder,
    eq(name: string, value: unknown) {
      rows = rows.filter((row) => column(row, name) === value);
      return builder;
    },
    neq(name: string, value: unknown) {
      rows = rows.filter((row) => column(row, name) !== value);
      return builder;
    },
    in(name: string, values: readonly unknown[]) {
      rows = rows.filter((row) => values.includes(column(row, name)));
      return builder;
    },
    insert(payload: Row | Row[]) {
      written = payload;
      return builder;
    },
    update(payload: Row) {
      written = payload;
      return builder;
    },
    upsert(payload: Row | Row[]) {
      written = payload;
      return builder;
    },
    delete() {
      written = [];
      return builder;
    },
    single: () => ok(written ?? rows[0] ?? null),
    maybeSingle: () => ok(written ?? rows[0] ?? null),
    // Deliberately thenable: PostgREST builders are awaited without a terminal call.
    // oxlint-disable-next-line no-thenable
    then<TResult>(
      onFulfilled: (value: { data: unknown; error: null }) => TResult,
    ): Promise<TResult> {
      return ok(written ?? rows).then(onFulfilled);
    },
  };

  return builder;
}

export function createShowcaseClient(): WishlistSupabaseClient {
  const client = {
    auth: {
      onAuthStateChange(callback: (event: string, session: unknown) => void) {
        // Asynchronous like the real client, so the subscriber is mounted first.
        queueMicrotask(() => callback("SIGNED_IN", SHOWCASE_SESSION));
        return { data: { subscription: { unsubscribe() {} } } };
      },
      getSession: () => ok({ session: SHOWCASE_SESSION }),
      getUser: () => ok({ user: SHOWCASE_SESSION.user }),
      refreshSession: () => ok({ session: SHOWCASE_SESSION, user: SHOWCASE_SESSION.user }),
      signInWithPassword: () => ok({ session: SHOWCASE_SESSION, user: SHOWCASE_SESSION.user }),
      updateUser: () => ok({ user: SHOWCASE_SESSION.user }),
      signOut: () => Promise.resolve({ error: null }),
      startAutoRefresh: () => Promise.resolve(),
      stopAutoRefresh: () => Promise.resolve(),
    },
    rpc(name: string, params: Params = {}) {
      return ok(RPC_HANDLERS[name]?.(params) ?? []);
    },
    from: (table: string) => createQueryBuilder(table),
    storage: {
      from: () => ({
        upload: (path: string) => ok({ path }),
        remove: () => ok([]),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
  };

  return client as unknown as WishlistSupabaseClient;
}
