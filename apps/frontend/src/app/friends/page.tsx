"use client";

import { Suspense, useState } from "react";
import { useGT } from "gt-next";
import { FriendsHeader } from "./components/friends-header/FriendsHeader";
import { FriendsTabs } from "./components/friends-tabs/FriendsTabs";
import { FriendCard } from "./components/friend-card/FriendCard";
import { FriendGroupCard } from "./components/friend-group-card/FriendGroupCard";
import { FriendGroupModal } from "./components/friend-group-modal/FriendGroupModal";
import { RequestCard } from "./components/request-card/RequestCard";
import { BlockedUserCard } from "./components/blocked-user-card/BlockedUserCard";
import { OutgoingRequestCard } from "./components/outgoing-request-card/OutgoingRequestCard";
import { AddFriendModal } from "./components/add-friend-modal/AddFriendModal";
import { FriendCardSkeleton } from "./components/friends-skeleton/FriendsSkeleton";
import { useFriendsPage } from "./hooks/use-friends-page";
import { FRIENDS_GRID_STYLE, FRIENDS_SKELETON_COUNT, REQUESTS_SKELETON_COUNT } from "./constants";
import { Button } from "@/components/ui/Button/Button";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useUserGuideStepCompletion } from "@/components/user-guide/UserGuideProvider";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";

function renderSkeletons(count: number) {
  return Array.from({ length: count }).map((_, i) => <FriendCardSkeleton key={i} />);
}

function FriendsPageContent() {
  const t = useGT();
  const {
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
    friends,
    friendsLoading,
    friendsError,
    groups,
    groupsLoading,
    groupsError,
    requests,
    requestsLoading,
    requestsError,
    outgoing,
    outgoingLoading,
    outgoingError,
    blocked,
    blockedLoading,
    blockedError,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    createGroup,
    updateGroup,
    removeFriend,
    blockUser,
    unblockUser,
    requestToDecline,
    blockOnDecline,
    setBlockOnDecline,
    closeDeclineRequest,
    handleDeclineRequest,
    handleConfirmDeclineRequest,
    handleRemoveFriend,
    handleConfirmRemoveFriend,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleCloseGroupModal,
    handleSubmitGroup,
  } = useFriendsPage();
  const [pendingGuideModalStep, setPendingGuideModalStep] = useState<number | null>(null);
  const completeAddFriendStep = useUserGuideStepCompletion(10);
  const completeCreateGroupStep = useUserGuideStepCompletion(12);

  function completePendingGuideModal(step: number, completeStep: () => void) {
    if (pendingGuideModalStep === step) {
      completeStep();
      setPendingGuideModalStep(null);
    }
  }

  function closeAddFriendModal() {
    setAddOpen(false);
    completePendingGuideModal(10, completeAddFriendStep);
  }

  function closeGroupModal() {
    handleCloseGroupModal();
  }

  async function submitGroup(payload: Parameters<typeof handleSubmitGroup>[0]) {
    await handleSubmitGroup(payload);
    completePendingGuideModal(12, completeCreateGroupStep);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <FriendsHeader
        onInvite={() => {
          setPendingGuideModalStep(10);
          setAddOpen(true);
        }}
      />

      <FriendsTabs
        active={tab}
        friendsCount={friends.length}
        groupsCount={groups.length}
        requestsCount={requests.length}
        blockedCount={blocked.length}
        sentCount={outgoing.length}
        action={
          tab === "groups" ? (
            <Button
              size="sm"
              onClick={() => {
                setPendingGuideModalStep(12);
                handleCreateGroup();
              }}
              data-guide-target="friends-create-group"
            >
              {t("Create group", { $id: "friends.groups.create" })}
            </Button>
          ) : null
        }
        onChange={setTab}
      />

      {tab === "friends" && (
        <div style={FRIENDS_GRID_STYLE}>
          {friendsLoading && renderSkeletons(FRIENDS_SKELETON_COUNT)}
          {friendsError && (
            <p>
              {t("Failed to load friends.", {
                $id: "friends.page.friendsError",
              })}
            </p>
          )}
          {!friendsLoading && !friendsError && friends.length === 0 && (
            <MascotEmptyState
              variant="sad-alone"
              message={t("No friends yet.", { $id: "friends.page.noFriends" })}
            />
          )}
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} onRemove={handleRemoveFriend} />
          ))}
        </div>
      )}

      {tab === "groups" && (
        <div style={FRIENDS_GRID_STYLE}>
          {groupsLoading && renderSkeletons(FRIENDS_SKELETON_COUNT)}
          {groupsError && (
            <p>
              {t("Failed to load groups.", {
                $id: "friends.groups.loadError",
              })}
            </p>
          )}
          {!groupsLoading && !groupsError && groups.length === 0 && (
            <p>{t("No groups yet.", { $id: "friends.groups.empty" })}</p>
          )}
          {groups.map((group) => (
            <FriendGroupCard
              key={group.id}
              group={group}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
            />
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div style={FRIENDS_GRID_STYLE}>
          {requestsLoading && renderSkeletons(REQUESTS_SKELETON_COUNT)}
          {requestsError && (
            <p>
              {t("Failed to load requests.", {
                $id: "friends.page.requestsError",
              })}
            </p>
          )}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <p>
              {t("No incoming requests.", {
                $id: "friends.page.noIncomingRequests",
              })}
            </p>
          )}
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onAccept={() => acceptRequest.mutate(r.id)}
              onReject={() => handleDeclineRequest(r.id, r.sender_id)}
              accepting={acceptRequest.isPending}
              rejecting={rejectRequest.isPending}
            />
          ))}
        </div>
      )}

      {tab === "sent" && (
        <div style={FRIENDS_GRID_STYLE}>
          {outgoingLoading && renderSkeletons(REQUESTS_SKELETON_COUNT)}
          {outgoingError && (
            <p>
              {t("Failed to load sent requests.", {
                $id: "friends.page.sentError",
              })}
            </p>
          )}
          {!outgoingLoading && !outgoingError && outgoing.length === 0 && (
            <p>{t("No sent requests.", { $id: "friends.page.noSentRequests" })}</p>
          )}
          {outgoing.map((r) => (
            <OutgoingRequestCard
              key={r.id}
              request={r}
              onCancel={() => cancelRequest.mutate(r.id)}
              cancelling={cancelRequest.isPending}
            />
          ))}
        </div>
      )}

      {tab === "blocked" && (
        <div style={FRIENDS_GRID_STYLE}>
          {blockedLoading && renderSkeletons(REQUESTS_SKELETON_COUNT)}
          {blockedError && (
            <p>{t("Failed to load blocked users.", { $id: "friends.page.blockedError" })}</p>
          )}
          {!blockedLoading && !blockedError && blocked.length === 0 && (
            <p>{t("You have not blocked anyone.", { $id: "friends.page.noBlocked" })}</p>
          )}
          {blocked.map((user) => (
            <BlockedUserCard
              key={user.id}
              user={user}
              onUnblock={(userId) => unblockUser.mutate(userId)}
              isPending={unblockUser.isPending}
            />
          ))}
        </div>
      )}

      <AddFriendModal open={addOpen} onClose={closeAddFriendModal} />
      <DeleteConfirmModal
        open={!!friendToRemoveId}
        onClose={closeRemoveFriend}
        onConfirm={handleConfirmRemoveFriend}
        extraContent={
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={blockOnRemove}
              onChange={(e) => setBlockOnRemove(e.target.checked)}
            />
            <span>
              {t("Also block this person so they cannot send you requests again", {
                $id: "friends.page.alsoBlock",
              })}
            </span>
          </label>
        }
        title={t("Remove Friend", { $id: "friends.page.removeFriendTitle" })}
        description={t(
          "Are you sure you want to remove this friend? You will need to send a new friend request to reconnect.",
          { $id: "friends.page.removeFriendDescription" },
        )}
        confirmLabel={t("Remove Friend", {
          $id: "friends.page.removeFriendConfirm",
        })}
        isPending={removeFriend.isPending || blockUser.isPending}
      />
      <DeleteConfirmModal
        open={!!requestToDecline}
        onClose={closeDeclineRequest}
        onConfirm={handleConfirmDeclineRequest}
        title={t("Decline Request", { $id: "friends.page.declineRequestTitle" })}
        description={t("They will not be told. You can accept a new request from them later.", {
          $id: "friends.page.declineRequestDescription",
        })}
        confirmLabel={t("Decline", { $id: "friends.page.declineRequestConfirm" })}
        isPending={rejectRequest.isPending || blockUser.isPending}
        extraContent={
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={blockOnDecline}
              onChange={(e) => setBlockOnDecline(e.target.checked)}
            />
            <span>
              {t("Also block this person so they cannot send you requests again", {
                $id: "friends.page.alsoBlock",
              })}
            </span>
          </label>
        }
      />
      <FriendGroupModal
        open={groupModalOpen}
        group={editingGroup}
        friends={friends}
        isSaving={createGroup.isPending || updateGroup.isPending}
        onClose={closeGroupModal}
        onSubmit={submitGroup}
      />
    </main>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsPageContent />
    </Suspense>
  );
}
