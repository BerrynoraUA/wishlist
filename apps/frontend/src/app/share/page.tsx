"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { useWishlistByToken, useWishlistItemsByToken } from "@/hooks/use-share";
import { WishlistItemsGrid } from "../wishlist/components/WishlistItemsGrid";
import { SharedWishlistHeader } from "./components/SharedWishlistHeader";
import { AuthPromptModal } from "./components/AuthPromptModal";
import { FriendRequestStatusModal } from "./components/FriendRequestStatusModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { checkFriendship, sendFriendRequest } from "@/api/friends";
import styles from "../wishlist/[id]/WishlistPage.module.scss";

const PAGE_SIZE = 12;

function SharedWishlistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const action = searchParams.get("action");
  const [page, setPage] = useState(1);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "sent" | "already_friends" | "error" | null
  >(null);
  const postLoginHandled = useRef(false);

  const {
    data: wishlist,
    isLoading: wishlistLoading,
    isError: wishlistError,
  } = useWishlistByToken(token);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useWishlistItemsByToken(token, {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const items = itemsData ?? [];
  const totalItems = wishlist?.items_count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // After login redirect: check friendship, redirect or send request
  useEffect(() => {
    if (
      action !== "reserve" ||
      !wishlist?.id ||
      !wishlist?.user_id ||
      postLoginHandled.current
    )
      return;
    postLoginHandled.current = true;

    // Clean action param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    router.replace(`/share?${params.toString()}`, { scroll: false });

    (async () => {
      try {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();
        if (!user) return;

        if (user.id === wishlist.user_id) {
          router.replace(`/wishlist/${wishlist.id}`);
          return;
        }

        const alreadyFriends = await checkFriendship(wishlist.user_id);
        if (alreadyFriends) {
          router.replace(`/wishlist/${wishlist.id}`);
          return;
        }

        await sendFriendRequest(wishlist.user_id);
        router.replace("/home?friendRequestSent=1");
        return;
      } catch {
        router.replace("/home");
      }
    })();
  }, [action, wishlist?.id, wishlist?.user_id, searchParams, router]);

  const handleReserveAttempt = () => {
    setAuthPromptOpen(true);
  };

  if (!token)
    return (
      <main className={styles.page}>
        <p>Invalid share link.</p>
      </main>
    );

  if (wishlistLoading || itemsLoading)
    return (
      <main className={styles.page}>
        <p>Loading wishlist...</p>
      </main>
    );

  if (wishlistError || itemsError)
    return (
      <main className={styles.page}>
        <p>Failed to load shared wishlist.</p>
      </main>
    );

  if (!wishlist)
    return (
      <main className={styles.page}>
        <p>Wishlist not found.</p>
      </main>
    );

  return (
    <main className={styles.page}>
      <SharedWishlistHeader wishlist={wishlist} />

      {items.length === 0 && <p>No items yet.</p>}
      {items.length > 0 && (
        <>
          <WishlistItemsGrid
            items={items}
            isOwner={false}
            showDiscountBadge={false}
            onToggleReserve={handleReserveAttempt}
          />
          {totalPages > 1 && (
            <Pagination page={page} total={totalPages} onChange={setPage} />
          )}
        </>
      )}

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        shareToken={token}
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
    <Suspense
      fallback={
        <main className={styles.page}>
          <p>Loading...</p>
        </main>
      }
    >
      <SharedWishlistContent />
    </Suspense>
  );
}
