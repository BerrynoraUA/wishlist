"use client";

import { Suspense } from "react";
import { useGT } from "gt-next";
import { WishlistItemsGrid } from "../wishlist/[id]/components/wishlist-items-grid/WishlistItemsGrid";
import { SharedWishlistHeader } from "./components/shared-wishlist-header/SharedWishlistHeader";
import { AuthPromptModal } from "./components/auth-prompt-modal/AuthPromptModal";
import { FriendRequestStatusModal } from "./components/friend-request-status-modal/FriendRequestStatusModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { useSharePage } from "./hooks/use-share-page";
import { ShareBrandBar } from "./components/share-brand-bar/ShareBrandBar";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";
import Link from "next/link";
import styles from "../wishlist/[id]/WishlistPage.module.scss";
import shareStyles from "./share.module.scss";

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
    signedIn,
  } = useSharePage();

  if (token && (wishlistLoading || itemsLoading)) return null;

  // A missing token, an expired or revoked link, and a deleted list all look the same to a visitor.
  if (!token || wishlistError || itemsError || !wishlist)
    return (
      <main className={styles.page}>
        <ShareBrandBar signedIn={signedIn} />
        <div className={shareStyles.unavailable}>
          <MascotEmptyState
            variant="magnifying-glass"
            message={t(
              "This wishlist isn't available. The link may have expired, or the owner made it private.",
              { $id: "share.page.unavailable" },
            )}
          />
          <Link href={signedIn ? "/home" : "/"} className={shareStyles.unavailableLink}>
            {signedIn
              ? t("Back to My Wishlists", { $id: "share.page.unavailable.home" })
              : t("Go to Wishlane", { $id: "share.page.unavailable.landing" })}
          </Link>
        </div>
      </main>
    );

  return (
    <main className={styles.page}>
      <ShareBrandBar signedIn={signedIn} />
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
