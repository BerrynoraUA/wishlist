"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Wishlist } from "@/types/wishlist";
import { getInitialInvite, getInitialFriendRequestSent } from "../helpers";
import { FRIEND_REQUEST_SENT_FLAG } from "../constants";

/**
 * Encapsulates every piece of modal state the home page owns:
 *
 * - create wishlist modal
 * - edit wishlist modal
 * - delete wishlist confirm
 * - friend invite modal (from ?friendInvite)
 * - friend request sent modal (from ?friendRequestSent=1)
 */
export function useHomeModals() {
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [editWishlist, setEditWishlist] = useState<Wishlist | null>(null);
  const [deleteWishlist, setDeleteWishlist] = useState<Wishlist | null>(null);

  const [inviteUserId] = useState(() => getInitialInvite(searchParams));
  const [inviteOpen, setInviteOpen] = useState(
    () => !!getInitialInvite(searchParams),
  );

  const [friendRequestSentOpen, setFriendRequestSentOpen] = useState(() =>
    getInitialFriendRequestSent(searchParams, FRIEND_REQUEST_SENT_FLAG),
  );

  return {
    createOpen,
    setCreateOpen,
    editWishlist,
    setEditWishlist,
    deleteWishlist,
    setDeleteWishlist,
    inviteUserId,
    inviteOpen,
    setInviteOpen,
    friendRequestSentOpen,
    setFriendRequestSentOpen,
  };
}
