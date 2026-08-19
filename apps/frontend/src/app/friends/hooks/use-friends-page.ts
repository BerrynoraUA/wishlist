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
  useBlockUser,
  useBlockedUsers,
  useUnblockUser,
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
  const [blockOnRemove, setBlockOnRemove] = useState(false);
  const [requestToDecline, setRequestToDecline] = useState<{
    requestId: string;
    senderId: string;
  } | null>(null);
  const [blockOnDecline, setBlockOnDecline] = useState(false);

  const search = useMemo(() => getFriendsSearch(searchParams), [searchParams]);

  const friendsQuery = useFriends({ search });
  const groupsQuery = useFriendGroups();
  const requestsQuery = useIncomingFriendRequests();
  const outgoingQuery = useOutgoingFriendRequests();
  const blockedQuery = useBlockedUsers({ search });

  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const cancelRequest = useCancelFriendRequest();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const createGroup = useCreateFriendGroup();
  const updateGroup = useUpdateFriendGroup();
  const deleteGroup = useDeleteFriendGroup();

  function handleRemoveFriend(friendId: string) {
    setFriendToRemoveId(friendId);
    setBlockOnRemove(false);
  }

  function closeRemoveFriend() {
    setFriendToRemoveId(null);
    setBlockOnRemove(false);
  }

  function handleConfirmRemoveFriend() {
    if (!friendToRemoveId) return;

    // Blocking already drops the friendship, so it replaces the plain removal
    // rather than running alongside it.
    const mutation = blockOnRemove ? blockUser : removeFriend;
    mutation.mutate(friendToRemoveId, { onSuccess: closeRemoveFriend });
  }

  function handleDeclineRequest(requestId: string, senderId: string) {
    setRequestToDecline({ requestId, senderId });
    setBlockOnDecline(false);
  }

  function closeDeclineRequest() {
    setRequestToDecline(null);
    setBlockOnDecline(false);
  }

  function handleConfirmDeclineRequest() {
    if (!requestToDecline) return;

    // Blocking already cancels the pending request, so it stands in for the
    // plain rejection rather than running after it.
    if (blockOnDecline) {
      blockUser.mutate(requestToDecline.senderId, { onSuccess: closeDeclineRequest });
      return;
    }

    rejectRequest.mutate(requestToDecline.requestId, { onSuccess: closeDeclineRequest });
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
    blockOnRemove,
    setBlockOnRemove,
    closeRemoveFriend,
    requestToDecline,
    blockOnDecline,
    setBlockOnDecline,
    closeDeclineRequest,
    handleDeclineRequest,
    handleConfirmDeclineRequest,
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
    blocked: blockedQuery.data ?? [],
    blockedLoading: blockedQuery.isLoading,
    blockedError: blockedQuery.isError,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    blockUser,
    unblockUser,
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
