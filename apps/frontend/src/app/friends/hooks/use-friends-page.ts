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
  useCreateFriendGroup,
  useDeleteFriendGroup,
  useFriendGroups,
  useUpdateFriendGroup,
} from "@/hooks/use-friends";
import type { FriendGroup, FriendGroupPayload } from "@/api/types/friends";
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
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FriendGroup | null>(null);
  const [friendToRemoveId, setFriendToRemoveId] = useState<string | null>(null);

  const search = useMemo(() => getFriendsSearch(searchParams), [searchParams]);

  const friendsQuery = useFriends({ search });
  const groupsQuery = useFriendGroups();
  const requestsQuery = useIncomingFriendRequests();
  const outgoingQuery = useOutgoingFriendRequests();

  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const cancelRequest = useCancelFriendRequest();
  const createGroup = useCreateFriendGroup();
  const updateGroup = useUpdateFriendGroup();
  const deleteGroup = useDeleteFriendGroup();

  function handleRemoveFriend(friendId: string) {
    setFriendToRemoveId(friendId);
  }

  function handleConfirmRemoveFriend() {
    if (!friendToRemoveId) return;

    removeFriend.mutate(friendToRemoveId, {
      onSuccess: () => setFriendToRemoveId(null),
    });
  }

  function handleCreateGroup() {
    setEditingGroup(null);
    setGroupModalOpen(true);
  }

  function handleEditGroup(group: FriendGroup) {
    setEditingGroup(group);
    setGroupModalOpen(true);
  }

  function handleCloseGroupModal() {
    setGroupModalOpen(false);
    setEditingGroup(null);
  }

  async function handleSubmitGroup(payload: FriendGroupPayload) {
    if (editingGroup) {
      await updateGroup.mutateAsync({ groupId: editingGroup.id, payload });
    } else {
      await createGroup.mutateAsync(payload);
    }
    handleCloseGroupModal();
  }

  function handleDeleteGroup(group: FriendGroup) {
    const message = t("Are you sure you want to delete this group?", {
      $id: "friends.groups.confirmDelete",
    });
    if (confirmRemoveFriend(message)) {
      deleteGroup.mutate(group.id);
    }
  }

  return {
    tab,
    setTab,
    addOpen,
    setAddOpen,
    groupModalOpen,
    editingGroup,
    friendToRemoveId,
    friends: friendsQuery.data ?? [],
    friendsLoading: friendsQuery.isLoading,
    friendsError: friendsQuery.isError,
    groups: groupsQuery.data ?? [],
    groupsLoading: groupsQuery.isLoading,
    groupsError: groupsQuery.isError,
    requests: requestsQuery.data ?? [],
    requestsLoading: requestsQuery.isLoading,
    requestsError: requestsQuery.isError,
    outgoing: outgoingQuery.data ?? [],
    outgoingLoading: outgoingQuery.isLoading,
    outgoingError: outgoingQuery.isError,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    createGroup,
    updateGroup,
    deleteGroup,
    handleRemoveFriend,
    handleConfirmRemoveFriend,
    setFriendToRemoveId,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleCloseGroupModal,
    handleSubmitGroup,
  };
}
