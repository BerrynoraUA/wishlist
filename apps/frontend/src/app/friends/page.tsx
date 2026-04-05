"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
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

function FriendsPageContent() {
  const t = useGT();
  const [tab, setTab] = useState<"friends" | "requests" | "sent">("friends");
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const search = useMemo(
    () => searchParams.get("search") ?? "",
    [searchParams],
  );

  const { data, isLoading, isError } = useFriends({ search });
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
    if (
      confirm(
        t("Are you sure you want to remove this friend?", {
          $id: "friends.page.confirmRemove",
        }),
      )
    ) {
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {isLoading && (
            <p>{t("Loading...", { $id: "friends.page.loading" })}</p>
          )}
          {isError && (
            <p>
              {t("Failed to load friends.", {
                $id: "friends.page.friendsError",
              })}
            </p>
          )}
          {!isLoading && !isError && friends.length === 0 && (
            <p>{t("No friends yet.", { $id: "friends.page.noFriends" })}</p>
          )}
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} onRemove={handleRemoveFriend} />
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {requestsLoading && (
            <p>{t("Loading...", { $id: "friends.page.loading" })}</p>
          )}
          {requestsError && (
            <p>
              {t("Failed to load requests.", {
                $id: "friends.page.requestsError",
              })}
            </p>
          )}
          {!requestsLoading &&
            !requestsError &&
            (requests?.length ?? 0) === 0 && (
              <p>
                {t("No incoming requests.", {
                  $id: "friends.page.noIncomingRequests",
                })}
              </p>
            )}
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {outgoingLoading && (
            <p>{t("Loading...", { $id: "friends.page.loading" })}</p>
          )}
          {outgoingError && (
            <p>
              {t("Failed to load sent requests.", {
                $id: "friends.page.sentError",
              })}
            </p>
          )}
          {!outgoingLoading &&
            !outgoingError &&
            (outgoing?.length ?? 0) === 0 && (
              <p>
                {t("No sent requests.", { $id: "friends.page.noSentRequests" })}
              </p>
            )}
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

export default function FriendsPage() {
  const t = useGT();
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
          <p>
            {t("Loading friends...", { $id: "friends.page.suspenseLoading" })}
          </p>
        </main>
      }
    >
      <FriendsPageContent />
    </Suspense>
  );
}
