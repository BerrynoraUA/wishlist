import { friendsQueryOptions } from "@/hooks/use-friends";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { itemVotesQueryOptions, wishlistItemsQueryOptions } from "@/hooks/use-items";
import {
  secretSantaDetailsQueryOptions,
  secretSantaEventsQueryOptions,
} from "@/hooks/use-secret-santa";
import {
  discoverAllQueryOptions,
  discoverAvailableQueryOptions,
  discoverPurchasedQueryOptions,
  discoverReservedQueryOptions,
  friendsUpcomingWishlistsQueryOptions,
  friendWishlistsQueryOptions,
  myStatisticsQueryOptions,
  myWishlistsQueryOptions,
  wishlistByIdQueryOptions,
} from "@/hooks/use-wishlists";
import { DISCOVER_PAGE_SIZE, EMPTY_DISCOVER_FILTERS, toDiscoverQueryParams } from "@/lib/discover";
import { FRIENDS_PAGE_SIZE } from "@/lib/friend-query-keys";
import { EMPTY_ITEM_FILTERS, toItemQueryParams, WISHLIST_ITEMS_PAGE_SIZE } from "@/lib/items";
import { SECRET_SANTA_PAGE_SIZE } from "@/lib/secret-santa";
import { DEFAULT_WISHLIST_SORT, WISHLIST_PAGE_SIZE } from "@/lib/wishlists";
import { useAuth } from "@/providers/auth-provider";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { DiscoverSection, ReservedItem } from "@wishlist/backend/types/discover";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Image } from "expo-image";
import * as React from "react";

/** Data fetched more recently than this, by a screen or an earlier run, is not fetched again. */
const PREFETCH_INTERVAL = 1000 * 60 * 15;
/** Wishlists prefetched in parallel; each one is three requests. */
const WISHLIST_BATCH_SIZE = 4;

// The params each screen starts from, so prefetched entries are the ones it reads.
const MY_WISHLISTS_PARAMS = { search: "", sort: DEFAULT_WISHLIST_SORT, visibilityTypes: [] };
const DEFAULT_ITEM_PARAMS = toItemQueryParams(EMPTY_ITEM_FILTERS, "");

/**
 * Loads the first page of the screens people open most — their wishlists, their friends and
 * friends' wishlists, the items in all of those, Discover and Secret Santa — while the device
 * is online, so they are on hand after it goes offline. The cache is saved to disk by `lib/query-persister.ts`.
 *
 * Runs on sign-in and whenever the connection comes back.
 */
export function useOfflinePrefetch({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  React.useEffect(() => {
    if (!enabled || !userId) return;

    let running = false;

    function run() {
      if (running || !onlineManager.isOnline()) return;
      running = true;
      void prefetchOfflineData(queryClient, userId!)
        .catch(() => undefined)
        .finally(() => {
          running = false;
        });
    }

    run();
    return onlineManager.subscribe((isOnline) => {
      if (isOnline) run();
    });
  }, [enabled, queryClient, userId]);
}

async function prefetchOfflineData(queryClient: QueryClient, userId: string) {
  const fresh = { staleTime: PREFETCH_INTERVAL };

  // Discover prices are filtered and sorted in the display currency, which is part of the
  // cache key, so it has to be known before Discover is fetched.
  const settings = await queryClient
    .fetchQuery({ ...settingsQueryOptions(userId), ...fresh })
    .catch(() => undefined);
  const displayCurrency = normalizeCurrencyCode(settings?.display_currency);

  const [myWishlists, friends, discoverImageUrls] = await Promise.all([
    queryClient
      .fetchInfiniteQuery({
        ...myWishlistsQueryOptions(userId, MY_WISHLISTS_PARAMS, WISHLIST_PAGE_SIZE),
        ...fresh,
      })
      .then((data) => data.pages.flat())
      .catch(() => []),
    queryClient
      .fetchInfiniteQuery({ ...friendsQueryOptions(userId, {}, FRIENDS_PAGE_SIZE), ...fresh })
      .then((data) => data.pages.flat())
      .catch(() => []),
    prefetchDiscover(queryClient, userId, displayCurrency),
    queryClient.prefetchQuery({ ...myStatisticsQueryOptions(userId), ...fresh }),
    prefetchSecretSanta(queryClient, userId),
  ]);

  const friendWishlists = await Promise.all(
    friends.map((friend) =>
      queryClient
        .fetchInfiniteQuery({
          ...friendWishlistsQueryOptions(userId, friend.friend_id, {}, WISHLIST_PAGE_SIZE),
          ...fresh,
        })
        .then((data) => data.pages.flat())
        .catch(() => [] as Wishlist[]),
    ),
  );

  const wishlists = [...myWishlists, ...friendWishlists.flat()];
  const imageUrls = [...discoverImageUrls, ...wishlists.map((wishlist) => wishlist.image_url)];

  for (let index = 0; index < wishlists.length; index += WISHLIST_BATCH_SIZE) {
    const batch = wishlists.slice(index, index + WISHLIST_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ id }) => {
        const [, items] = await Promise.all([
          queryClient.prefetchQuery({ ...wishlistByIdQueryOptions(userId, id), ...fresh }),
          queryClient
            .fetchInfiniteQuery({
              ...wishlistItemsQueryOptions(
                userId,
                id,
                DEFAULT_ITEM_PARAMS,
                WISHLIST_ITEMS_PAGE_SIZE,
              ),
              ...fresh,
            })
            .then((data) => data.pages.flat())
            .catch(() => []),
        ]);
        if (items.length === 0) return;

        imageUrls.push(...items.map((item) => item.image_url));
        await queryClient.prefetchQuery({
          ...itemVotesQueryOptions(
            userId,
            items.map((item) => item.id),
          ),
          ...fresh,
        });
      }),
    );
  }

  // Images are most of the bytes; leave them to be cached as they are viewed on metered
  // connections.
  const network = await NetInfo.fetch();
  if (network.details?.isConnectionExpensive) return;

  const urls = [...new Set(imageUrls.filter((url): url is string => Boolean(url)))];
  // Disk only: holding hundreds of decoded images in memory would crowd out the visible ones.
  if (urls.length > 0) await Image.prefetch(urls, "disk");
}

/** Every Discover tab, unfiltered. Returns the item image URLs it saw. */
async function prefetchDiscover(queryClient: QueryClient, userId: string, displayCurrency: string) {
  const options = { staleTime: PREFETCH_INTERVAL };
  const params = toDiscoverQueryParams(EMPTY_DISCOVER_FILTERS, displayCurrency);
  const sectionImages = (sections: DiscoverSection[]) =>
    sections.flatMap((section) => section.items.map((item) => item.image_url ?? item.image));
  const reservedImages = (items: ReservedItem[]) => items.map((item) => item.image);

  const [all, available, reserved, purchased] = await Promise.all([
    queryClient
      .fetchInfiniteQuery({
        ...discoverAllQueryOptions(userId, params, DISCOVER_PAGE_SIZE),
        ...options,
      })
      .then((data) => sectionImages(data.pages.flat()))
      .catch(() => []),
    queryClient
      .fetchInfiniteQuery({
        ...discoverAvailableQueryOptions(userId, params, DISCOVER_PAGE_SIZE),
        ...options,
      })
      .then((data) => sectionImages(data.pages.flat()))
      .catch(() => []),
    queryClient
      .fetchInfiniteQuery({
        ...discoverReservedQueryOptions(userId, params, DISCOVER_PAGE_SIZE),
        ...options,
      })
      .then((data) => reservedImages(data.pages.flat()))
      .catch(() => []),
    queryClient
      .fetchInfiniteQuery({
        ...discoverPurchasedQueryOptions(userId, params, DISCOVER_PAGE_SIZE),
        ...options,
      })
      .then((data) => reservedImages(data.pages.flat()))
      .catch(() => []),
    queryClient.prefetchQuery({ ...friendsUpcomingWishlistsQueryOptions(userId), ...options }),
  ]);

  return [...all, ...available, ...reserved, ...purchased];
}

/** The events list and the details of every event on its first page. */
async function prefetchSecretSanta(queryClient: QueryClient, userId: string) {
  const options = { staleTime: PREFETCH_INTERVAL };
  const events = await queryClient
    .fetchInfiniteQuery({
      ...secretSantaEventsQueryOptions(userId, {}, SECRET_SANTA_PAGE_SIZE),
      ...options,
    })
    .then((data) => data.pages.flatMap((page) => page.items))
    .catch(() => []);

  await Promise.all(
    events.map((event) =>
      queryClient.prefetchQuery({
        ...secretSantaDetailsQueryOptions(userId, event.id),
        ...options,
      }),
    ),
  );
}
