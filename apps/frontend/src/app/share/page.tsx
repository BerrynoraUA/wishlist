"use client";

import { Suspense } from "react";
import { useGT } from "gt-next";
import { WishlistItemsGrid } from "../wishlist/[id]/components/wishlist-items-grid/WishlistItemsGrid";
import { SharedWishlistHeader } from "./components/shared-wishlist-header/SharedWishlistHeader";
import { AuthPromptModal } from "./components/auth-prompt-modal/AuthPromptModal";
import { FriendRequestStatusModal } from "./components/friend-request-status-modal/FriendRequestStatusModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { useSharePage } from "./hooks/use-share-page";
import styles from "../wishlist/[id]/WishlistPage.module.scss";

function SharedWishlistContent() {
  const t = useGT();
  const {
    token,
    page,
    setPage,
    totalPages,
    wishlist,
    wishlistLoading,
    wishlistError,
    items,
    itemsLoading,
    itemsError,
    authPromptOpen,
    setAuthPromptOpen,
    pendingReserveItemId,
    friendStatus,
    setFriendStatus,
    handleReserveAttempt,
  } = useSharePage();

  if (!token)
    return (
      <main className={styles.page}>
        <p>{t("Invalid share link.", { $id: "share.page.invalidLink" })}</p>
      </main>
    );

  if (wishlistLoading || itemsLoading) return null;

  if (wishlistError || itemsError)
    return (
      <main className={styles.page}>
        <p>
          {t("Failed to load shared wishlist.", {
            $id: "share.page.loadError",
          })}
        </p>
      </main>
    );

  if (!wishlist)
    return (
      <main className={styles.page}>
        <p>{t("Wishlist not found.", { $id: "share.page.notFound" })}</p>
      </main>
    );

  return (
    <main className={styles.page}>
      <SharedWishlistHeader wishlist={wishlist} />

      {items.length === 0 && <p>{t("No items yet.", { $id: "wishlist.page.noItems" })}</p>}
      {items.length > 0 && (
        <>
          <WishlistItemsGrid
            items={items}
            isOwner={false}
            showDiscountBadge={false}
            onToggleReserve={handleReserveAttempt}
          />
          {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} />}
        </>
      )}

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        shareToken={token}
        itemId={pendingReserveItemId}
        page={page}
      />

      {friendStatus && (
        <FriendRequestStatusModal
          open={!!friendStatus}
          onClose={() => setFriendStatus(null)}
          status={friendStatus}
        />
      )}
    </main>
  );
}

export default function SharedWishlistPage() {
  return (
    <Suspense fallback={null}>
      <SharedWishlistContent />
    </Suspense>
  );
}
