"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardHeader } from "./components/DashboardHeader";
import { StatsRow } from "./components/StatsRow";
import { WishlistGrid } from "./components/WishlistGrid";
import { CreateWishlistModal } from "@/app/wishlist/components/CreateWishlistModal";
import { FriendInviteModal } from "@/app/friends/components/FriendInviteModal";
import { FriendRequestSentModal } from "@/app/share/components/FriendRequestSentModal";

function getInitialInvite(searchParams: URLSearchParams) {
  return searchParams.get("friendInvite") ?? "";
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const cleaned = useRef(false);

  const [inviteUserId] = useState(() => getInitialInvite(searchParams));
  const [inviteOpen, setInviteOpen] = useState(
    () => !!getInitialInvite(searchParams),
  );

  const [friendRequestSent] = useState(
    () => searchParams.get("friendRequestSent") === "1",
  );
  const [friendRequestSentOpen, setFriendRequestSentOpen] = useState(
    () => searchParams.get("friendRequestSent") === "1",
  );

  useEffect(() => {
    if (cleaned.current || (!inviteUserId && !friendRequestSent)) return;
    cleaned.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("friendInvite");
    params.delete("friendRequestSent");
    const next = params.toString();
    router.replace(next ? `/home?${next}` : "/home", { scroll: false });
  }, [inviteUserId, searchParams, router]);
  return (
    <>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <DashboardHeader onNewWishlist={() => setOpen(true)} />
        <StatsRow />
        <WishlistGrid />

        <CreateWishlistModal open={open} onClose={() => setOpen(false)} />
        <FriendInviteModal
          open={inviteOpen}
          userId={inviteUserId}
          onClose={() => setInviteOpen(false)}
        />
        <FriendRequestSentModal
          open={friendRequestSentOpen}
          onClose={() => setFriendRequestSentOpen(false)}
        />
      </main>
    </>
  );
}
