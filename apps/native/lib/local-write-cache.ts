import type { QueryClient } from "@tanstack/react-query";
import type { QueuedWrite } from "./write-queue";
import type { FriendGroupPayload, FriendWithDetails } from "@wishlist/backend/types/friends";
import type { InfiniteData } from "@tanstack/react-query";
import { EMPTY_ITEM_FILTERS, toItemQueryParams, WISHLIST_ITEMS_PAGE_SIZE } from "./items";
import { itemKeys } from "./item-query-keys";
import { DEFAULT_WISHLIST_SORT, WISHLIST_PAGE_SIZE } from "./wishlist-query-keys";

type Row = { id?: string; [key: string]: unknown };

function containsRecord(data: unknown, id: string): boolean {
  if (Array.isArray(data)) return data.some((entry) => containsRecord(entry, id));
  if (!data || typeof data !== "object") return false;
  const value = data as Row;
  return value.id === id || containsRecord(value.pages, id) || containsRecord(value.items, id);
}

/** Update the known list/detail shapes without changing unrelated queries or pages. */
function patchData(data: unknown, write: QueuedWrite, insert: boolean): unknown {
  if (!data || typeof data !== "object") return data;
  const row = write.local as Row;
  if (Array.isArray(data)) {
    const rows = data as Row[];
    const found = rows.some((entry) => entry.id === write.id);
    const next = rows.flatMap((entry) =>
      entry.id !== write.id
        ? [entry]
        : write.action === "delete"
          ? []
          : [mergeRow(entry, row, write)],
    );
    return insert && !found && write.action === "create" ? [row, ...next] : next;
  }
  const value = data as Row;
  if (Array.isArray(value.pages)) {
    const exists = containsRecord(value.pages, write.id);
    return {
      ...value,
      pages: value.pages.map((page, index) =>
        patchData(page, write, insert && !exists && index === 0),
      ),
    };
  }
  if (Array.isArray(value.items)) {
    const items = patchData(value.items, write, insert) as unknown[];
    return { ...value, items, total: Number(value.total ?? 0) + items.length - value.items.length };
  }
  if (value.id === write.id || write.entity === "settings") {
    return write.action === "delete" ? null : mergeRow(value, row, write);
  }
  return data;
}

function mergeRow(previous: Row, next: Row, write: QueuedWrite) {
  return {
    ...previous,
    ...next,
    ...(write.entity === "wishlist" &&
      write.action === "create" &&
      previous.items_count !== undefined && { items_count: previous.items_count }),
  };
}

function matchesQuery(key: readonly unknown[], write: QueuedWrite) {
  const { entity, userId, id } = write;
  if (entity === "access") return false;
  if (entity === "wishlist")
    return (
      key[0] === "wishlists" &&
      ((key[1] === "my" && key[2] === userId) ||
        (key[1] === "detail" && key[2] === id && key[3] === userId))
    );
  if (entity === "item")
    return (
      key[0] === "items" &&
      key[1] === "wishlist" &&
      key[2] === userId &&
      (write.action !== "create" || key[3] === (write.local as Row).wishlist_id)
    );
  if (entity === "group")
    return key[0] === "friends" && key[1] === "groups" && key[2] === "list" && key[3] === userId;
  if (entity === "event")
    return key[0] === "secret-santa" && key[2] === userId && (key[1] === "list" || key[3] === id);
  return (
    key[0] === "settings" &&
    key[1] === (entity === "profile" ? "profile" : "preferences") &&
    key[2] === userId
  );
}

export function applyLocalWrite(client: QueryClient, write: QueuedWrite) {
  if (write.entity === "access") {
    const payload = write.payload as { targetId: string; group?: boolean; accessType?: number };
    const key = ["wishlist-access-list", write.userId, write.id];
    const previous = client.getQueryData<Row[]>(key) ?? [];
    const rest = previous.filter((row) => (row.group_id ?? row.id) !== payload.targetId);
    const target = payload.group
      ? findLocalRecord<Row>(client, "group", payload.targetId)
      : undefined;
    const friend = client
      .getQueriesData<InfiniteData<FriendWithDetails[]>>({
        queryKey: ["friends", "list", write.userId],
      })
      .flatMap(([, data]) => data?.pages.flat() ?? [])
      .find((row) => row.friend_id === payload.targetId);
    client.setQueryData(
      key,
      write.action === "delete"
        ? rest
        : [
            ...rest,
            {
              ...target,
              id: payload.targetId,
              group_id: payload.group ? payload.targetId : null,
              target_type: payload.group ? "group" : "user",
              nickname: friend?.nickname ?? "",
              access_type: payload.group ? 2 : (payload.accessType ?? 3),
              access_role: "viewer",
            },
          ],
    );
    return;
  }
  const known = findLocalRecord<Row>(client, write.entity, write.id);
  if (write.action === "create") {
    const listKey =
      write.entity === "wishlist"
        ? [
            "wishlists",
            "my",
            write.userId,
            {
              search: undefined,
              sort: DEFAULT_WISHLIST_SORT,
              visibilityTypes: [],
              take: WISHLIST_PAGE_SIZE,
            },
          ]
        : write.entity === "group"
          ? ["friends", "groups", "list", write.userId, { search: undefined, take: 20 }]
          : write.entity === "event"
            ? ["secret-santa", "list", write.userId, { search: undefined, limit: 20 }]
            : undefined;
    if (listKey && !client.getQueryData(listKey)) {
      client.setQueryData(listKey, {
        pages: [write.entity === "event" ? { items: [], total: 0, offset: 0, limit: 20 } : []],
        pageParams: [0],
      });
    }
  }
  if (write.entity === "item" && write.action === "create") {
    const params = {
      ...toItemQueryParams(EMPTY_ITEM_FILTERS, ""),
      search: undefined,
      take: WISHLIST_ITEMS_PAGE_SIZE,
    };
    const key = itemKeys.wishlist(write.userId, (write.local as Row).wishlist_id as string, params);
    if (!client.getQueryData(key)) client.setQueryData(key, { pages: [[]], pageParams: [0] });
  }
  for (const query of client
    .getQueryCache()
    .findAll({ predicate: (entry) => matchesQuery(entry.queryKey, write) })) {
    const isList =
      write.entity === "item" ||
      query.queryKey[1] === "my" ||
      query.queryKey[1] === "list" ||
      query.queryKey[2] === "list";
    const emptyPage = write.entity === "event" ? { items: [], total: 0, offset: 0, limit: 20 } : [];
    const data =
      query.state.data ?? (isList ? { pages: [emptyPage], pageParams: [0] } : write.local);
    client.setQueryData(query.queryKey, patchData(data, write, true));
  }
  if (write.action === "create" && write.entity === "wishlist") {
    const key = ["wishlists", "detail", write.id, write.userId];
    if (!client.getQueryData(key)) client.setQueryData(key, write.local);
  }
  if (write.action === "create" && write.entity === "event") {
    client.setQueryData(["secret-santa", "detail", write.userId, write.id], write.local);
  }
  if (write.entity === "profile" || write.entity === "settings") {
    client.setQueryData(
      ["settings", write.entity === "profile" ? "profile" : "preferences", write.userId],
      write.local,
    );
  }
  if (
    write.entity === "group" &&
    write.action !== "delete" &&
    Array.isArray((write.payload as FriendGroupPayload).memberIds)
  ) {
    const friends = client
      .getQueriesData<InfiniteData<FriendWithDetails[]>>({
        queryKey: ["friends", "list", write.userId],
      })
      .flatMap(([, data]) => data?.pages.flat() ?? []);
    const ids = (write.payload as FriendGroupPayload).memberIds;
    client.setQueryData(
      ["friends", "groups", "members", write.userId, write.id],
      ids.map((id) => {
        const friend = friends.find((entry) => entry.friend_id === id);
        return {
          id,
          nickname: friend?.nickname ?? null,
          display_name: friend?.display_name ?? null,
          avatar_url: friend?.avatar_url ?? null,
        };
      }),
    );
  }
  const delta =
    write.action === "create" && !known ? 1 : write.action === "delete" && known ? -1 : 0;
  if (delta && (write.entity === "item" || write.entity === "wishlist")) {
    const field = write.entity === "item" ? "total_items_count" : "wishlists_count";
    client.setQueriesData<Row>({ queryKey: ["statistics", "my", write.userId] }, (data) =>
      data ? { ...data, [field]: Math.max(0, Number(data[field] ?? 0) + delta) } : data,
    );
    if (write.entity === "item") {
      const wishlistId = ((write.local ?? known) as Row).wishlist_id;
      const parent = findLocalRecord<Row>(client, "wishlist", wishlistId as string);
      for (const query of client.getQueryCache().findAll({ queryKey: ["wishlists"] })) {
        if (parent)
          client.setQueryData(
            query.queryKey,
            patchData(
              query.state.data,
              {
                ...write,
                entity: "wishlist",
                action: "update",
                id: wishlistId as string,
                local: {
                  ...parent,
                  items_count: Math.max(0, Number(parent.items_count ?? 0) + delta),
                },
              },
              false,
            ),
          );
      }
    }
  }
}

export function findLocalRecord<T>(
  client: QueryClient,
  entity: QueuedWrite["entity"],
  id: string,
): T | undefined {
  const roots = {
    wishlist: "wishlists",
    item: "items",
    group: "friends",
    event: "secret-santa",
    profile: "settings",
    settings: "settings",
    access: "wishlist-access-list",
  };
  function find(data: unknown): T | undefined {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data)) {
      for (const entry of data) {
        const found = find(entry);
        if (found) return found;
      }
      return;
    }
    const row = data as Row;
    if (row.id === id || (row.user_id === id && entity === "settings")) return row as T;
    return find(row.pages) ?? find(row.items);
  }
  const cached = client.getQueriesData({ queryKey: [roots[entity]] });
  // Details can contain participants and other fields absent from a list card.
  cached.sort(([left], [right]) => Number(right[1] === "detail") - Number(left[1] === "detail"));
  for (const [, data] of cached) {
    const found = find(data);
    if (found) return found;
  }
}

/** A reconnect fetch may finish before the queue. Keep later local edits visible. */
export function reapplyPendingWrites(client: QueryClient) {
  for (const mutation of client.getMutationCache().getAll()) {
    if (mutation.options.mutationKey?.[1] !== "write" || mutation.state.status !== "pending")
      continue;
    applyLocalWrite(client, mutation.state.variables as QueuedWrite);
  }
}

export function discardLocalWrite(client: QueryClient, write: QueuedWrite) {
  if (write.action === "create")
    applyLocalWrite(client, { ...write, action: "delete", local: undefined });
  else if (write.previous)
    applyLocalWrite(client, {
      ...write,
      action: write.action === "delete" ? "create" : "update",
      local: write.previous,
    });
  reapplyPendingWrites(client);
}
