"use client";

import { Suspense } from "react";
import { useGT } from "gt-next";
import { DashboardHeader } from "./components/dashboard-header/DashboardHeader";
import { StatsRow } from "./components/stats-row/StatsRow";
import { WishlistGrid } from "./components/wishlist-grid/WishlistGrid";
import { CreateWishlistModal } from "@/app/wishlist/[id]/components/create-wishlist-modal/CreateWishlistModal";
import { EditWishlistModal } from "@/app/wishlist/[id]/components/edit-wishlist-modal/EditWishlistModal";
import { FriendInviteModal } from "@/app/friends/components/friend-invite-modal/FriendInviteModal";
import { FriendRequestSentModal } from "@/app/share/components/friend-request-sent-modal/FriendRequestSentModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";
import { useDeleteWishlist } from "@/hooks/use-wishlists";
import { useHomeModals } from "./hooks/use-home-modals";
import { useHomeQueryParamCleanup } from "./hooks/use-home-query-param-cleanup";

function HomePageContent() {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const deleteWishlistMutation = useDeleteWishlist();
  const hasCreateWishlistDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "create-wishlist",
  });

  const modals = useHomeModals();
  useHomeQueryParamCleanup();

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <DashboardHeader
        onNewWishlist={() => modals.setCreateOpen(true)}
        hasDraft={hasCreateWishlistDraft}
      />
      <StatsRow />
      <WishlistGrid
        onCreateWishlist={() => modals.setCreateOpen(true)}
        onEditWishlist={modals.setEditWishlist}
        onDeleteWishlist={modals.setDeleteWishlist}
        hasCreateDraft={hasCreateWishlistDraft}
      />

      <CreateWishlistModal
        open={modals.createOpen}
        onClose={() => modals.setCreateOpen(false)}
      />
      {modals.editWishlist && (
        <EditWishlistModal
          open={!!modals.editWishlist}
          onClose={() => modals.setEditWishlist(null)}
          wishlist={modals.editWishlist}
        />
      )}
      <DeleteConfirmModal
        open={!!modals.deleteWishlist}
        onClose={() => modals.setDeleteWishlist(null)}
        onConfirm={() => {
          if (!modals.deleteWishlist) return;

          deleteWishlistMutation.mutate(modals.deleteWishlist.id, {
            onSuccess: () => modals.setDeleteWishlist(null),
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
        open={modals.inviteOpen}
        userId={modals.inviteUserId}
        onClose={() => modals.setInviteOpen(false)}
      />
      <FriendRequestSentModal
        open={modals.friendRequestSentOpen}
        onClose={() => modals.setFriendRequestSentOpen(false)}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
