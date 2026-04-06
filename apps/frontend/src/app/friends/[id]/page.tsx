"use client";

import { Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import Link from "next/link";
import { useFriendWishlists } from "@/hooks/use-wishlists";
import { useRemoveFriend } from "@/hooks/use-friends";
import { WishlistCard } from "@/app/home/components/WishlistCard";
import { Button } from "@/components/ui/Button/Button";
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

  function handleRemoveFriend() {
    if (
      confirm(
        t("Are you sure you want to remove this friend?", {
          $id: "friends.detail.confirmRemove",
        }),
      )
    ) {
      removeFriend.mutate(friendId, {
        onSuccess: () => router.push("/friends"),
      });
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/friends" className={styles.back}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1>
              {t("Friend's Wishlists", { $id: "friends.detail.title" })}
            </h1>
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
