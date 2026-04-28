"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import Link from "next/link";
import { useFriendWishlists } from "@/hooks/use-wishlists";
import { useRemoveFriend } from "@/hooks/use-friends";
import { WishlistCard } from "@/app/home/components/wishlist-card/WishlistCard";
import { Button } from "@/components/ui/Button/Button";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { ArrowLeft, UserMinus } from "lucide-react";
import styles from "./FriendWishlists.module.scss";

function FriendWishlistsPageContent() {
  const t = useGT();
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;
  const searchParams = useSearchParams();
  const search = useMemo(
    () => searchParams.get("search") ?? "",
    [searchParams],
  );

  const {
    data: wishlists = [],
    isLoading,
    isError,
  } = useFriendWishlists(friendId, { search });

  const removeFriend = useRemoveFriend();
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  function handleRemoveFriend() {
    setRemoveConfirmOpen(true);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/friends" className={styles.back}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1>{t("Friend's Wishlists", { $id: "friends.detail.title" })}</h1>
            <p>
              {wishlists.length === 1
                ? t("{count} wishlist", {
                    count: wishlists.length,
                    $id: "friends.detail.wishlistCountOne",
                  })
                : t("{count} wishlists", {
                    count: wishlists.length,
                    $id: "friends.detail.wishlistCountOther",
                  })}
            </p>
          </div>
        </div>

        <Button variant="danger" size="sm" onClick={handleRemoveFriend}>
          <UserMinus size={14} style={{ marginRight: 6 }} />
          {t("Remove Friend", { $id: "friends.detail.removeFriend" })}
        </Button>
      </div>

      {isError && (
        <p>
          {t("Failed to load wishlists.", {
            $id: "friends.detail.loadError",
          })}
        </p>
      )}
      {!isLoading && !isError && wishlists.length === 0 && (
        <p className={styles.empty}>
          {t("This friend has no visible wishlists.", {
            $id: "friends.detail.empty",
          })}
        </p>
      )}

      <div className={styles.grid}>
        {wishlists.map((w) => (
          <WishlistCard key={w.id} wishlist={w} showSharedMeta={false} />
        ))}
      </div>

      <DeleteConfirmModal
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={() => {
          removeFriend.mutate(friendId, {
            onSuccess: () => router.push("/friends"),
          });
        }}
        title={t("Remove Friend", { $id: "friends.detail.removeFriendTitle" })}
        description={t(
          "Are you sure you want to remove this friend? You will need to send a new friend request to reconnect.",
          { $id: "friends.detail.removeFriendDescription" },
        )}
        confirmLabel={t("Remove Friend", {
          $id: "friends.detail.removeFriendConfirm",
        })}
        isPending={removeFriend.isPending}
      />
    </main>
  );
}

export default function FriendWishlistsPage() {
  return (
    <Suspense fallback={null}>
      <FriendWishlistsPageContent />
    </Suspense>
  );
}
