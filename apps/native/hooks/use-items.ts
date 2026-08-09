import {
  createItem,
  deleteItem,
  getItemVotes,
  getWishlistItems,
  toggleItemBought,
  toggleItemReservation,
  toggleItemVote,
  updateItem,
} from "@/api/items";
import { useSkipTakeInfiniteQuery } from "@/hooks/use-infinite-page";
import { itemKeys } from "@/lib/item-query-keys";
import { normalizeItemSearch } from "@/lib/items";
import { statisticsKeys, wishlistKeys } from "@/lib/wishlist-query-keys";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateItemParams,
  ItemQueryParams,
  ItemVotesResult,
  UpdateItemParams,
} from "@wishlist/backend/types/item";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useInfiniteWishlistItems(
  wishlistId: string,
  params: ItemQueryParams,
  pageSize: number,
) {
  const { user } = useAuth();
  const normalizedParams = {
    ...params,
    skip: undefined,
    take: undefined,
    search: normalizeItemSearch(params.search) || undefined,
  };

  return useSkipTakeInfiniteQuery({
    queryKey: itemKeys.wishlist(user?.id, wishlistId, {
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
    enabled: Boolean(user?.id && wishlistId),
  });
}

function invalidateWishlistItems(
  queryClient: ReturnType<typeof useQueryClient>,
  wishlistId?: string,
) {
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
    onSuccess: (item) => invalidateWishlistItems(queryClient, item.wishlist_id),
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

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => invalidateWishlistItems(queryClient),
  });
}

export function useToggleItemReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemReservation(id),
    onSuccess: (item) => invalidateWishlistItems(queryClient, item.wishlist_id),
  });
}

export function useToggleItemBought() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemBought(id),
    onSuccess: (item) => invalidateWishlistItems(queryClient, item.wishlist_id),
  });
}

export function useItemVotes(itemIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: itemKeys.votes(user?.id, itemIds),
    queryFn: () => getItemVotes(itemIds),
    enabled: Boolean(user?.id) && itemIds.length > 0,
  });
}

export function useToggleItemVote(itemIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const votesKey = itemKeys.votes(user?.id, itemIds);

  return useMutation({
    mutationFn: (itemId: string) => toggleItemVote(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: votesKey });
      const previous = queryClient.getQueryData<ItemVotesResult>(votesKey);

      queryClient.setQueryData<ItemVotesResult>(votesKey, (old) => {
        if (!old) return old;
        const hadVote = old.userVotes.has(itemId);
        const nextCounts = { ...old.counts };
        const nextUserVotes = new Set(old.userVotes);

        if (hadVote) {
          nextCounts[itemId] = Math.max(0, (nextCounts[itemId] ?? 1) - 1);
          nextUserVotes.delete(itemId);
        } else {
          nextCounts[itemId] = (nextCounts[itemId] ?? 0) + 1;
          nextUserVotes.add(itemId);
        }

        return { counts: nextCounts, userVotes: nextUserVotes };
      });

      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(votesKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: votesKey });
    },
  });
}
