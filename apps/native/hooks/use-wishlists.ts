import { useQueuedWrite } from "@/hooks/use-queued-write";
import { findLocalRecord } from "@/lib/local-write-cache";
import { newRecordId } from "@/lib/record-id";

import {
  getFriendWishlists,
  getFriendsUpcomingWishlists,
  getFriendsWishlistsDiscover,
  getFriendsWishlistsDiscoverAll,
  getFriendsWishlistsPurchasedByMe,
  getFriendsWishlistsReservedByMe,
  getMyStatistics,
  getMyWishlists,
  getWishlistById,
} from "@/api/wishlists";
import { skipTakeInfiniteQueryOptions } from "@/hooks/use-infinite-page";
import { normalizeSearchQuery } from "@/lib/wishlists";
import { animateCardRemoval, markNewCard } from "@/lib/card-motion";

import { statisticsKeys, wishlistKeys } from "@/lib/wishlist-query-keys";
import type { DiscoverQueryParams } from "@wishlist/backend/types/discover";
import { useAuth } from "@/providers/auth-provider";
import type {
  Wishlist,
  WishlistFormValues,
  WishlistQueryParams,
  WishlistUpdateValues,
} from "@wishlist/backend/types/wishlist";
import {
  queryOptions,
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

function normalizeWishlistParams(params: WishlistQueryParams) {
  return {
    ...params,
    skip: undefined,
    take: undefined,
    search: normalizeSearchQuery(params.search) || undefined,
  };
}

export function myWishlistsQueryOptions(
  authUserId: string | undefined,
  params: WishlistQueryParams,
  pageSize: number,
) {
  const normalizedParams = normalizeWishlistParams(params);

  return skipTakeInfiniteQueryOptions({
    queryKey: wishlistKeys.my(authUserId, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getMyWishlists({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
  });
}

export function useInfiniteMyWishlists(
  params: WishlistQueryParams,
  pageSize: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    ...myWishlistsQueryOptions(user?.id, params, pageSize),
    enabled: enabled && Boolean(user?.id),
    placeholderData: () => {
      const cached = queryClient.getQueriesData<InfiniteData<Wishlist[]>>({
        queryKey: ["wishlists", "my", user?.id],
      });
      const rows = new Map(
        cached.flatMap(([, data]) => data?.pages.flat() ?? []).map((row) => [row.id, row]),
      );
      if (!rows.size) return undefined;
      const search = normalizeSearchQuery(params.search).toLowerCase();
      const items = [...rows.values()].filter(
        (row) =>
          row.title.toLowerCase().includes(search) &&
          (!params.visibilityTypes?.length || params.visibilityTypes.includes(row.visibility_type)),
      );
      return { pages: [items], pageParams: [0] };
    },
  });
}

export function myStatisticsQueryOptions(authUserId: string | undefined) {
  return queryOptions({
    queryKey: statisticsKeys.my(authUserId),
    queryFn: getMyStatistics,
  });
}

export function useMyStatistics({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();

  return useQuery({
    ...myStatisticsQueryOptions(user?.id),
    enabled: enabled && Boolean(user?.id),
  });
}

export function friendWishlistsQueryOptions(
  authUserId: string | undefined,
  userId: string,
  params: WishlistQueryParams,
  pageSize: number,
) {
  const normalizedParams = normalizeWishlistParams(params);

  return skipTakeInfiniteQueryOptions({
    queryKey: wishlistKeys.friend(authUserId, userId, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendWishlists(userId, {
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
  });
}

export function useInfiniteFriendWishlists(
  userId: string,
  params: WishlistQueryParams,
  pageSize: number,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...friendWishlistsQueryOptions(user?.id, userId, params, pageSize),
    enabled: Boolean(user?.id && userId),
  });
}

function normalizeDiscoverParams(params: DiscoverQueryParams) {
  return {
    ...params,
    search: normalizeSearchQuery(params.search) || undefined,
    priorities: params.priorities?.length ? params.priorities : undefined,
    priceMin: params.priceMin ?? undefined,
    priceMax: params.priceMax ?? undefined,
  };
}

function discoverQueryOptions<T>(
  queryKey: (authUserId: string | undefined, params: DiscoverQueryParams) => QueryKey,
  fetchPage: (params: DiscoverQueryParams) => Promise<T[]>,
  authUserId: string | undefined,
  params: DiscoverQueryParams,
  pageSize: number,
) {
  const normalizedParams = normalizeDiscoverParams(params);

  return skipTakeInfiniteQueryOptions({
    queryKey: queryKey(authUserId, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) => fetchPage({ ...normalizedParams, skip, take }),
    pageSize,
  });
}

export function discoverAllQueryOptions(
  authUserId: string | undefined,
  params: DiscoverQueryParams,
  pageSize: number,
) {
  return discoverQueryOptions(
    wishlistKeys.discoverAll,
    getFriendsWishlistsDiscoverAll,
    authUserId,
    params,
    pageSize,
  );
}

export function discoverAvailableQueryOptions(
  authUserId: string | undefined,
  params: DiscoverQueryParams,
  pageSize: number,
) {
  return discoverQueryOptions(
    wishlistKeys.discoverAvailable,
    getFriendsWishlistsDiscover,
    authUserId,
    params,
    pageSize,
  );
}

export function discoverReservedQueryOptions(
  authUserId: string | undefined,
  params: DiscoverQueryParams,
  pageSize: number,
) {
  return discoverQueryOptions(
    wishlistKeys.discoverReserved,
    getFriendsWishlistsReservedByMe,
    authUserId,
    params,
    pageSize,
  );
}

export function discoverPurchasedQueryOptions(
  authUserId: string | undefined,
  params: DiscoverQueryParams,
  pageSize: number,
) {
  return discoverQueryOptions(
    wishlistKeys.discoverPurchased,
    getFriendsWishlistsPurchasedByMe,
    authUserId,
    params,
    pageSize,
  );
}

export function useInfiniteFriendsWishlistsDiscoverAll(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...discoverAllQueryOptions(user?.id, params, pageSize),
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsDiscover(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...discoverAvailableQueryOptions(user?.id, params, pageSize),
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsReservedByMe(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...discoverReservedQueryOptions(user?.id, params, pageSize),
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsPurchasedByMe(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...discoverPurchasedQueryOptions(user?.id, params, pageSize),
    enabled: Boolean(user?.id) && enabled,
  });
}

export function friendsUpcomingWishlistsQueryOptions(authUserId: string | undefined) {
  return queryOptions({
    queryKey: wishlistKeys.discoverUpcoming(authUserId),
    queryFn: getFriendsUpcomingWishlists,
  });
}

export function useFriendsUpcomingWishlists() {
  const { user } = useAuth();

  return useQuery({
    ...friendsUpcomingWishlistsQueryOptions(user?.id),
    enabled: Boolean(user?.id),
  });
}

function wishlistPatch(values: WishlistUpdateValues) {
  return {
    ...(values.title !== undefined && { title: values.title }),
    ...(values.description !== undefined && { description: values.description }),
    ...(values.imageUrl !== undefined && { image_url: values.imageUrl }),
    ...(values.visibility !== undefined && { visibility_type: values.visibility }),
    ...(values.accent !== undefined && { accent_type: values.accent }),
    ...(values.eventDate !== undefined && { event_date: values.eventDate || null }),
  };
}

export function useCreateWishlist() {
  return useQueuedWrite((values: WishlistFormValues, userId) => {
    const id = newRecordId();
    const local: Wishlist = {
      id,
      user_id: userId,
      title: values.title,
      description: values.description || null,
      image_url: values.imageUrl || null,
      created_at: new Date().toISOString(),
      visibility_type: values.visibility,
      accent_type: values.accent,
      event_date: values.eventDate || null,
      items_count: 0,
      can_edit: true,
      is_owner: true,
      access_type: null,
      owner_nickname: null,
      is_pinned: false,
    };
    markNewCard("wishlist", id);
    return { entity: "wishlist", action: "create", id, userId, payload: values, local };
  });
}

export function useUpdateWishlist() {
  return usePatchWishlist();
}

export function usePatchWishlist() {
  return useQueuedWrite(
    ({ id, values }: { id: string; values: WishlistUpdateValues }, userId, client) => {
      const previous = findLocalRecord<Wishlist>(client, "wishlist", id);
      if (!previous)
        throw new Error("Open this wishlist while connected before editing it offline.");
      return {
        entity: "wishlist",
        action: "update",
        id,
        userId,
        payload: values,
        local: { ...previous, ...wishlistPatch(values) },
      };
    },
  );
}

export function useWishlistById(
  wishlistId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    ...wishlistByIdQueryOptions(user?.id, wishlistId),
    enabled: enabled && Boolean(user?.id && wishlistId),
    placeholderData: () => {
      if (!user?.id || !wishlistId) return undefined;

      // Keep the known header visible while the detail request refreshes it.
      const lists = queryClient.getQueriesData<InfiniteData<Wishlist[]>>({
        queryKey: wishlistKeys.all,
        predicate: ({ queryKey }) =>
          (queryKey[1] === "my" || queryKey[1] === "friend") && queryKey[2] === user.id,
      });
      for (const [, data] of lists) {
        const wishlist = data?.pages
          .flatMap((page) => page)
          .find((entry) => entry.id === wishlistId);
        if (wishlist) return wishlist;
      }
      return undefined;
    },
  });
}

export function wishlistByIdQueryOptions(authUserId: string | undefined, wishlistId: string) {
  return queryOptions({
    queryKey: wishlistKeys.detail(authUserId, wishlistId),
    queryFn: () => getWishlistById(wishlistId),
  });
}

export function useDeleteWishlist(onBeforeRemoval?: () => void) {
  return useQueuedWrite(async (id: string, userId) => {
    onBeforeRemoval?.();
    await animateCardRemoval("wishlist", id);
    return { entity: "wishlist", action: "delete", id, userId, payload: {}, local: undefined };
  });
}

export function useGrantWishlistAccess() {
  return useQueuedWrite(
    (
      {
        wishlistId: id,
        grantedToUserId: targetId,
        accessType,
      }: { wishlistId: string; grantedToUserId: string; accessType: 0 | 1 | 2 | 3 },
      userId,
    ) => ({
      entity: "access",
      action: "update",
      id,
      userId,
      payload: { targetId, accessType },
      local: undefined,
    }),
  );
}

export function useRevokeWishlistAccess() {
  return useQueuedWrite(
    (
      { wishlistId: id, targetUserId: targetId }: { wishlistId: string; targetUserId: string },
      userId,
    ) => ({
      entity: "access",
      action: "delete",
      id,
      userId,
      payload: { targetId },
      local: undefined,
    }),
  );
}
