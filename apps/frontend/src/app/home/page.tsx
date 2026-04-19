"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { DashboardHeader } from "./components/DashboardHeader";
import { StatsRow } from "./components/StatsRow";
import { WishlistGrid } from "./components/WishlistGrid";
import { CreateWishlistModal } from "@/app/wishlist/components/CreateWishlistModal";
import { EditWishlistModal } from "@/app/wishlist/components/EditWishlistModal";
import { FriendInviteModal } from "@/app/friends/components/FriendInviteModal";
import { FriendRequestSentModal } from "@/app/share/components/FriendRequestSentModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useDeleteWishlist } from "@/hooks/use-wishlists";
import { Wishlist } from "@/types/wishlist";

function getInitialInvite(searchParams: URLSearchParams) {
  return searchParams.get("friendInvite") ?? "";
}

function HomePageContent() {
  const t = useGT();
  const [open, setOpen] = useState(false);
  const [editWishlist, setEditWishlist] = useState<Wishlist | null>(null);
  const [deleteWishlist, setDeleteWishlist] = useState<Wishlist | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const cleaned = useRef(false);
  const deleteWishlistMutation = useDeleteWishlist();

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
        <WishlistGrid
          onCreateWishlist={() => setOpen(true)}
          onEditWishlist={setEditWishlist}
          onDeleteWishlist={setDeleteWishlist}
        />

        <CreateWishlistModal open={open} onClose={() => setOpen(false)} />
        {editWishlist && (
          <EditWishlistModal
            open={!!editWishlist}
            onClose={() => setEditWishlist(null)}
            wishlist={editWishlist}
          />
        )}
        <DeleteConfirmModal
          open={!!deleteWishlist}
          onClose={() => setDeleteWishlist(null)}
          onConfirm={() => {
            if (!deleteWishlist) return;

            deleteWishlistMutation.mutate(deleteWishlist.id, {
              onSuccess: () => setDeleteWishlist(null),
            });
          }}
          title={t("Delete Wishlist", {
            $id: "wishlist.page.deleteWishlistTitle",
          })}
          description={t(
            "Are you sure you want to delete this entire wishlist and all its items? This action cannot be undone.",
            { $id: "wishlist.page.deleteWishlistDescription" },
          )}
          confirmLabel={t("Delete Wishlist", {
            $id: "wishlist.page.deleteWishlistConfirm",
          })}
          isPending={deleteWishlistMutation.isPending}
        />
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

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
