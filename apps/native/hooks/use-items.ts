import {
  createItem,
  deleteItem,
  getItemVotes,
  getWishlistItems,
  reportItem,
  toggleItemBought,
  toggleItemReservation,
  toggleItemVote,
  updateItem,
} from "@/api/items";
import { skipTakeInfiniteQueryOptions } from "@/hooks/use-infinite-page";
import { animateCardRemoval, markNewCard } from "@/lib/card-motion";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { itemKeys } from "@/lib/item-query-keys";
import {
  normalizeItemSearch,
  optimisticallyToggleItemBought,
  optimisticallyToggleItemReservation,
} from "@/lib/items";
import { OFFLINE_QUEUE_KEY } from "@/lib/offline-mutations";
import { statisticsKeys, wishlistKeys } from "@/lib/wishlist-query-keys";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateItemParams,
  Item,
  ItemQueryParams,
  ItemVotesResult,
  UpdateItemParams,
} from "@wishlist/backend/types/item";
import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type MutateOptions,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

export function wishlistItemsQueryOptions(
  authUserId: string | undefined,
  wishlistId: string,
  params: ItemQueryParams,
  pageSize: number,
) {
  const normalizedParams = {
    ...params,
    skip: undefined,
    take: undefined,
    search: normalizeItemSearch(params.search) || undefined,
  };

  return skipTakeInfiniteQueryOptions({
    queryKey: itemKeys.wishlist(authUserId, wishlistId, {
      ...normalizedParams,
      take: pageSize,
    }),
    fetchPage: ({ skip, take }) =>
      getWishlistItems(wishlistId, {
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
  });
}

export function useInfiniteWishlistItems(
  wishlistId: string,
  params: ItemQueryParams,
  pageSize: number,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...wishlistItemsQueryOptions(user?.id, wishlistId, params, pageSize),
    enabled: Boolean(user?.id && wishlistId),
  });
}

function invalidateWishlistItems(queryClient: QueryClient, wishlistId?: string) {
  void queryClient.invalidateQueries({ queryKey: itemKeys.all });
  void queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
  if (wishlistId) {
    void queryClient.invalidateQueries({ queryKey: wishlistKeys.detailRoot(wishlistId) });
  }
  void queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateItemParams) => createItem(params),
    onSuccess: (item) => {
      markNewCard("item", item.id);
      invalidateWishlistItems(queryClient, item.wishlist_id);
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateItemParams }) =>
      updateItem(id, updates),
    onSuccess: (item) => invalidateWishlistItems(queryClient, item.wishlist_id),
  });
}

export function useDeleteItem(onBeforeRemoval?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: async (_, id) => {
      hapticSuccess();
      onBeforeRemoval?.();
      await animateCardRemoval("item", id);
      invalidateWishlistItems(queryClient);
    },
    onError: hapticError,
  });
}

type ToggleItemVariables = { itemId: string; userId: string };

export const queuedItemMutationKeys = {
  toggleReservation: [OFFLINE_QUEUE_KEY, "items", "toggle-reservation"] as const,
  toggleBought: [OFFLINE_QUEUE_KEY, "items", "toggle-bought"] as const,
  toggleVote: [OFFLINE_QUEUE_KEY, "items", "toggle-vote"] as const,
};

/** Applies `update` to the item wherever a cached wishlist item list holds it. */
async function patchCachedItem(
  queryClient: QueryClient,
  itemId: string,
  update: (item: Item) => Item,
) {
  const filters = {
    queryKey: itemKeys.all,
    predicate: (query: Query) => query.queryKey[1] === "wishlist",
  };
  await queryClient.cancelQueries(filters);
  queryClient.setQueriesData<InfiniteData<Item[]>>(filters, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) =>
            page.map((item) => (item.id === itemId ? update(item) : item)),
          ),
        }
      : data,
  );
}

function toggleVoteInResult(votes: ItemVotesResult, itemId: string): ItemVotesResult {
  const hadVote = votes.userVotes.has(itemId);
  const nextCounts = { ...votes.counts };
  const nextUserVotes = new Set(votes.userVotes);

  if (hadVote) {
    nextCounts[itemId] = Math.max(0, (nextCounts[itemId] ?? 1) - 1);
    nextUserVotes.delete(itemId);
  } else {
    nextCounts[itemId] = (nextCounts[itemId] ?? 0) + 1;
    nextUserVotes.add(itemId);
  }

  return { counts: nextCounts, userVotes: nextUserVotes };
}

/**
 * Reserving, marking bought and voting work offline: they update the cached lists right
 * away, wait in a queue saved with the query cache, and replay in order on reconnect (see
 * `lib/offline-mutations.ts`). They are registered as defaults, not in the hooks, because a
 * write restored after a restart has only its key. Every outcome refetches, so the lists
 * settle on what the server accepted.
 */
export function registerQueuedItemMutations(queryClient: QueryClient) {
  // One scope runs the queue serially, so toggles of the same item replay in order.
  // Success is felt once the server accepts the write, which offline is after reconnecting.
  const queued = {
    scope: { id: OFFLINE_QUEUE_KEY },
    retry: 2,
    onSuccess: () => hapticSuccess(),
    onError: () => hapticError(),
  };

  queryClient.setMutationDefaults(queuedItemMutationKeys.toggleReservation, {
    ...queued,
    mutationFn: ({ itemId }: ToggleItemVariables) => toggleItemReservation(itemId),
    onMutate: ({ itemId, userId }: ToggleItemVariables) =>
      patchCachedItem(queryClient, itemId, (item) =>
        optimisticallyToggleItemReservation(item, userId),
      ),
    onSettled: (item?: Item) => invalidateWishlistItems(queryClient, item?.wishlist_id),
  });

  queryClient.setMutationDefaults(queuedItemMutationKeys.toggleBought, {
    ...queued,
    mutationFn: ({ itemId }: ToggleItemVariables) => toggleItemBought(itemId),
    onMutate: ({ itemId, userId }: ToggleItemVariables) =>
      patchCachedItem(queryClient, itemId, (item) => optimisticallyToggleItemBought(item, userId)),
    onSettled: (item?: Item) => invalidateWishlistItems(queryClient, item?.wishlist_id),
  });

  queryClient.setMutationDefaults(queuedItemMutationKeys.toggleVote, {
    ...queued,
    mutationFn: (itemId: string) => toggleItemVote(itemId),
    onMutate: async (itemId: string) => {
      const filters = {
        queryKey: itemKeys.all,
        predicate: (query: Query) =>
          query.queryKey[1] === "votes" && query.queryKey.includes(itemId),
      };
      await queryClient.cancelQueries(filters);
      queryClient.setQueriesData<ItemVotesResult>(filters, (votes) =>
        votes ? toggleVoteInResult(votes, itemId) : votes,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all,
        predicate: (query) => query.queryKey[1] === "votes",
      });
    },
  });
}

/**
 * Hook side of a queued item toggle. A write waiting in the offline queue is reported as
 * not pending, so its buttons stay usable instead of spinning until reconnect.
 */
function useQueuedItemToggle(mutationKey: readonly unknown[]) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const mutation = useMutation<Item, Error, ToggleItemVariables>({ mutationKey });
  const { mutate: mutateVariables } = mutation;
  const mutate = React.useCallback(
    (itemId: string, options?: MutateOptions<Item, Error, ToggleItemVariables>) =>
      mutateVariables({ itemId, userId }, options),
    [mutateVariables, userId],
  );

  return { ...mutation, mutate, isPending: mutation.isPending && !mutation.isPaused };
}

export function useToggleItemReservation() {
  return useQueuedItemToggle(queuedItemMutationKeys.toggleReservation);
}

export function useToggleItemBought() {
  return useQueuedItemToggle(queuedItemMutationKeys.toggleBought);
}

export function useReportItem() {
  return useMutation({
    mutationFn: (itemId: string) => reportItem(itemId),
    onSuccess: hapticSuccess,
    onError: hapticError,
  });
}

export function useItemVotes(itemIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    ...itemVotesQueryOptions(user?.id, itemIds),
    enabled: Boolean(user?.id) && itemIds.length > 0,
  });
}

export function itemVotesQueryOptions(authUserId: string | undefined, itemIds: string[]) {
  return queryOptions({
    queryKey: itemKeys.votes(authUserId, itemIds),
    queryFn: () => getItemVotes(itemIds),
  });
}

export function useToggleItemVote() {
  return useMutation<unknown, Error, string>({ mutationKey: queuedItemMutationKeys.toggleVote });
}
