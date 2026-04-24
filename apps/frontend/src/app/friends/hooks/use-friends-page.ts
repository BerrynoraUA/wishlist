"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import {
  useAcceptFriendRequest,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRejectFriendRequest,
  useRemoveFriend,
  useCancelFriendRequest,
} from "@/hooks/use-friends";
import { confirmRemoveFriend, getFriendsSearch } from "../helpers";
import { DEFAULT_FRIENDS_TAB, type FriendsTab } from "../constants";

/**
 * Encapsulates every piece of React state & query wiring the Friends page
 * owns: active tab, add-friend modal, search param, all list queries, and
 * mutation handlers.
 */
export function useFriendsPage() {
  const t = useGT();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<FriendsTab>(DEFAULT_FRIENDS_TAB);
  const [addOpen, setAddOpen] = useState(false);

  const search = useMemo(() => getFriendsSearch(searchParams), [searchParams]);

  const friendsQuery = useFriends({ search });
  const requestsQuery = useIncomingFriendRequests();
  const outgoingQuery = useOutgoingFriendRequests();

  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const cancelRequest = useCancelFriendRequest();

  function handleRemoveFriend(friendId: string) {
    const message = t("Are you sure you want to remove this friend?", {
      $id: "friends.page.confirmRemove",
    });
    if (confirmRemoveFriend(message)) {
      removeFriend.mutate(friendId);
    }
  }

  return {
    tab,
    setTab,
    addOpen,
    setAddOpen,
    friends: friendsQuery.data ?? [],
    friendsLoading: friendsQuery.isLoading,
    friendsError: friendsQuery.isError,
    requests: requestsQuery.data ?? [],
    requestsLoading: requestsQuery.isLoading,
    requestsError: requestsQuery.isError,
    outgoing: outgoingQuery.data ?? [],
    outgoingLoading: outgoingQuery.isLoading,
    outgoingError: outgoingQuery.isError,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    handleRemoveFriend,
  };
}
