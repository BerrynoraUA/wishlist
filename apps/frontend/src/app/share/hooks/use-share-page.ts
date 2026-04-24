"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWishlistByToken, useWishlistItemsByToken } from "@/hooks/use-share";
import { useCurrentUserId } from "@/hooks/use-user";
import { checkFriendship, sendFriendRequest } from "@/api/friends";
import { SHARE_PAGE_SIZE, SHARE_QUERY_PARAMS, SHARE_RESERVE_ACTION } from "../constants";
import { buildShareCleanupUrl, buildWishlistDestinationUrl, parsePageParam } from "../helpers";

type FriendStatus = "sent" | "already_friends" | "error" | null;

/**
 * Owns the shared wishlist page: token/action params, pagination state,
 * auth-prompt & friend-status modals, queries, and the post-login
 * "resume reserve" effect.
 */
export function useSharePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get(SHARE_QUERY_PARAMS.TOKEN) ?? "";
  const action = searchParams.get(SHARE_QUERY_PARAMS.ACTION);
  const reservedItemId = searchParams.get(SHARE_QUERY_PARAMS.ITEM);

  const [page, setPage] = useState(() => parsePageParam(searchParams.get(SHARE_QUERY_PARAMS.PAGE)));
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [pendingReserveItemId, setPendingReserveItemId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(null);

  const postLoginHandled = useRef(false);

  const { data: currentUserId = "", isLoading: isCurrentUserLoading } = useCurrentUserId();

  const wishlistQuery = useWishlistByToken(token);
  const wishlist = wishlistQuery.data;

  const itemsQuery = useWishlistItemsByToken(token, {
    skip: (page - 1) * SHARE_PAGE_SIZE,
    take: SHARE_PAGE_SIZE,
  });
  const items = itemsQuery.data ?? [];

  const totalItems = wishlist?.items_count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / SHARE_PAGE_SIZE));

  useEffect(() => {
    if (
      action !== SHARE_RESERVE_ACTION ||
      !wishlist?.id ||
      !wishlist?.user_id ||
      postLoginHandled.current
    )
      return;

    if (isCurrentUserLoading || !currentUserId) return;

    postLoginHandled.current = true;

    router.replace(buildShareCleanupUrl(searchParams), { scroll: false });

    (async () => {
      try {
        if (currentUserId === wishlist.user_id) {
          router.replace(buildWishlistDestinationUrl(wishlist.id, reservedItemId, page));
          return;
        }

        const alreadyFriends = await checkFriendship(wishlist.user_id);
        if (alreadyFriends) {
          router.replace(buildWishlistDestinationUrl(wishlist.id, reservedItemId, page));
          return;
        }

        await sendFriendRequest(wishlist.user_id);
        router.replace("/home?friendRequestSent=1");
      } catch {
        router.replace("/home");
      }
    })();
  }, [
    action,
    currentUserId,
    isCurrentUserLoading,
    wishlist?.id,
    wishlist?.user_id,
    searchParams,
    router,
    reservedItemId,
    page,
  ]);

  function handleReserveAttempt(itemId: string) {
    setPendingReserveItemId(itemId);
    setAuthPromptOpen(true);
  }

  return {
    token,
    page,
    setPage,
    totalPages,
    wishlist,
    wishlistLoading: wishlistQuery.isLoading,
    wishlistError: wishlistQuery.isError,
    items,
    itemsLoading: itemsQuery.isLoading,
    itemsError: itemsQuery.isError,
    authPromptOpen,
    setAuthPromptOpen,
    pendingReserveItemId,
    friendStatus,
    setFriendStatus,
    handleReserveAttempt,
  };
}
