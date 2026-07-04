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
import { statisticsKeys, wishlistKeys } from "@/hooks/use-wishlists";
import { normalizeItemSearch } from "@/lib/items";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateItemParams,
  ItemQueryParams,
  ItemVotesResult,
  UpdateItemParams,
} from "@wishlist/backend/types/item";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const itemKeys = {
  all: ["items"] as const,
  wishlist: (authUserId: string | null | undefined, wishlistId: string, params?: ItemQueryParams) =>
    [...itemKeys.all, "wishlist", authUserId ?? "anonymous", wishlistId, params] as const,
  votes: (authUserId: string | null | undefined, itemIds: string[]) =>
    [...itemKeys.all, "votes", authUserId ?? "anonymous", ...itemIds.sort()] as const,
};

export function useWishlistItems(wishlistId: string, params?: ItemQueryParams) {
  const { user } = useAuth();
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeItemSearch(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: itemKeys.wishlist(user?.id, wishlistId, normalizedParams),
    queryFn: () => getWishlistItems(wishlistId, normalizedParams),
    enabled: Boolean(user?.id && wishlistId),
  });
}

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

  return useInfiniteQuery({
    queryKey: itemKeys.wishlist(user?.id, wishlistId, { ...normalizedParams, take: pageSize }),
    queryFn: ({ pageParam }) =>
      getWishlistItems(wishlistId, {
        ...normalizedParams,
        skip: pageParam * pageSize,
        take: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === pageSize ? lastPageParam + 1 : undefined,
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
