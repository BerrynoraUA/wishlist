"use client";

import { useState } from "react";
import { FriendsHeader } from "./components/FriendsHeader";
import { FriendsTabs } from "./components/FriendsTabs";
import { FriendCard } from "./components/FriendCard";
import { RequestCard } from "./components/RequestCard";
import { OutgoingRequestCard } from "./components/OutgoingRequestCard";
import { AddFriendModal } from "./components/AddFriendModal";
import {
  useAcceptFriendRequest,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRejectFriendRequest,
  useRemoveFriend,
  useCancelFriendRequest,
} from "@/hooks/use-friends";

export default function FriendsPage() {
  const [tab, setTab] = useState<"friends" | "requests" | "sent">("friends");
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useFriends();
  const friends = data ?? [];

  const {
    data: requests,
    isLoading: requestsLoading,
    isError: requestsError,
  } = useIncomingFriendRequests();

  const {
    data: outgoing,
    isLoading: outgoingLoading,
    isError: outgoingError,
  } = useOutgoingFriendRequests();

  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const cancelRequest = useCancelFriendRequest();

  function handleRemoveFriend(friendId: string) {
    if (confirm("Are you sure you want to remove this friend?")) {
      removeFriend.mutate(friendId);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <FriendsHeader onInvite={() => setOpen(true)} />

      <FriendsTabs
        active={tab}
        friendsCount={friends.length}
        requestsCount={requests?.length ?? 0}
        sentCount={outgoing?.length ?? 0}
        onChange={setTab}
      />

      {tab === "friends" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {isLoading && <p>Loading...</p>}
          {isError && <p>Failed to load friends.</p>}
          {!isLoading && !isError && friends.length === 0 && (
            <p>No friends yet.</p>
          )}
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} onRemove={handleRemoveFriend} />
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {requestsLoading && <p>Loading...</p>}
          {requestsError && <p>Failed to load requests.</p>}
          {!requestsLoading &&
            !requestsError &&
            (requests?.length ?? 0) === 0 && <p>No incoming requests.</p>}
          {(requests ?? []).map((r) => (
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
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {outgoingLoading && <p>Loading...</p>}
          {outgoingError && <p>Failed to load sent requests.</p>}
          {!outgoingLoading &&
            !outgoingError &&
            (outgoing?.length ?? 0) === 0 && <p>No sent requests.</p>}
          {(outgoing ?? []).map((r) => (
            <OutgoingRequestCard
              key={r.id}
              request={r}
              onCancel={() => cancelRequest.mutate(r.id)}
              cancelling={cancelRequest.isPending}
            />
          ))}
        </div>
      )}

      <AddFriendModal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
