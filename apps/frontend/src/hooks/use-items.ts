import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getWishlistItems,
  createItem,
  updateItem,
  deleteItem,
  toggleItemReservation,
  toggleItemBought,
  toggleItemReservationSecret,
  toggleItemBoughtSecret,
  getItemVotes,
  toggleItemVote,
  type ItemVotesResult,
} from "@/api/items";
import type { CreateItemParams, UpdateItemParams } from "@/api/types/item";
import { wishlistKeys } from "./use-wishlists";
import { secretSantaKeys } from "./use-secret-santa";
import { statisticsKeys } from "./use-user";

// Query Keys
export const itemKeys = {
  all: ["items"] as const,
  wishlist: (wishlistId: string, params?: PaginationParams) =>
    [...itemKeys.all, "wishlist", wishlistId, params] as const,
  votes: (itemIds: string[]) =>
    [...itemKeys.all, "votes", ...itemIds.sort()] as const,
};

// Queries
export function useWishlistItems(
  wishlistId: string,
  params?: PaginationParams,
) {
  return useQuery({
    queryKey: itemKeys.wishlist(wishlistId, params),
    queryFn: () => getWishlistItems(wishlistId, params),
    enabled: !!wishlistId,
    placeholderData: keepPreviousData,
  });
}

// Mutations
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateItemParams) => createItem(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) &&
          queryKey[0] === itemKeys.all[0] &&
          queryKey[1] === "wishlist" &&
          queryKey[2] === data.wishlist_id,
      });
      queryClient.invalidateQueries({
        queryKey: wishlistKeys.my(),
      });
      queryClient.invalidateQueries({
        queryKey: wishlistKeys.detail(data.wishlist_id),
      });
      toast.success("Item added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add item");
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateItemParams }) =>
      updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      toast.success("Item updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update item");
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.my() });
      toast.success("Item deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete item");
    },
  });
}

export function useToggleItemReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.my() });
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) &&
          queryKey[0] === wishlistKeys.all[0] &&
          (queryKey[1] === "friends" || queryKey[1] === "friend"),
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update reservation");
    },
  });
}

export function useToggleItemBought() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemBought(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.my() });
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) &&
          queryKey[0] === wishlistKeys.all[0] &&
          (queryKey[1] === "friends" || queryKey[1] === "friend"),
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update purchase status");
    },
  });
}

export function useToggleItemReservationSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemReservationSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.my() });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update reservation");
    },
  });
}

export function useToggleItemBoughtSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemBoughtSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.my() });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update purchase status");
    },
  });
}

// Alias for legacy call sites still using the old name
export const useReserveItem = useToggleItemReservation;

// ── Item Votes ──

export function useItemVotes(itemIds: string[]) {
  return useQuery({
    queryKey: itemKeys.votes(itemIds),
    queryFn: () => getItemVotes(itemIds),
    enabled: itemIds.length > 0,
  });
}

export function useToggleItemVote(itemIds: string[]) {
  const queryClient = useQueryClient();
  const votesKey = itemKeys.votes(itemIds);

  return useMutation({
    mutationFn: (itemId: string) => toggleItemVote(itemId),
    onMutate: async (itemId: string) => {
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
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(votesKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: votesKey });
    },
  });
}
