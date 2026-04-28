"use client";

import { Suspense } from "react";
import { useGT } from "gt-next";
import { FriendsHeader } from "./components/friends-header/FriendsHeader";
import { FriendsTabs } from "./components/friends-tabs/FriendsTabs";
import { FriendCard } from "./components/friend-card/FriendCard";
import { FriendGroupCard } from "./components/friend-group-card/FriendGroupCard";
import { FriendGroupModal } from "./components/friend-group-modal/FriendGroupModal";
import { RequestCard } from "./components/request-card/RequestCard";
import { OutgoingRequestCard } from "./components/outgoing-request-card/OutgoingRequestCard";
import { AddFriendModal } from "./components/add-friend-modal/AddFriendModal";
import { FriendCardSkeleton } from "./components/friends-skeleton/FriendsSkeleton";
import { useFriendsPage } from "./hooks/use-friends-page";
import { FRIENDS_GRID_STYLE, FRIENDS_SKELETON_COUNT, REQUESTS_SKELETON_COUNT } from "./constants";
import { Button } from "@/components/ui/Button/Button";

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
    acceptRequest,
    rejectRequest,
    cancelRequest,
    createGroup,
    updateGroup,
    handleRemoveFriend,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleCloseGroupModal,
    handleSubmitGroup,
  } = useFriendsPage();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <FriendsHeader onInvite={() => setAddOpen(true)} />

      <FriendsTabs
        active={tab}
        friendsCount={friends.length}
        groupsCount={groups.length}
        requestsCount={requests.length}
        sentCount={outgoing.length}
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
            <p>{t("No friends yet.", { $id: "friends.page.noFriends" })}</p>
          )}
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} onRemove={handleRemoveFriend} />
          ))}
        </div>
      )}

      {tab === "groups" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <Button size="sm" onClick={handleCreateGroup}>
              {t("Create group", { $id: "friends.groups.create" })}
            </Button>
          </div>
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
        </>
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
              onReject={() => rejectRequest.mutate(r.id)}
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

      <AddFriendModal open={addOpen} onClose={() => setAddOpen(false)} />
      <FriendGroupModal
        open={groupModalOpen}
        group={editingGroup}
        friends={friends}
        isSaving={createGroup.isPending || updateGroup.isPending}
        onClose={handleCloseGroupModal}
        onSubmit={handleSubmitGroup}
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
