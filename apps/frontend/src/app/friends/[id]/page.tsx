"use client";

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFriendWishlists } from "@/hooks/use-wishlists";
import { useRemoveFriend } from "@/hooks/use-friends";
import { WishlistCard } from "@/app/home/components/WishlistCard";
import { Button } from "@/components/ui/Button/Button";
import { ArrowLeft, UserMinus } from "lucide-react";
import styles from "./FriendWishlists.module.scss";

export default function FriendWishlistsPage() {
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
    if (confirm("Are you sure you want to remove this friend?")) {
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
            <h1>Friend&apos;s Wishlists</h1>
            <p>{wishlists.length} wishlists</p>
          </div>
        </div>

        <Button variant="danger" size="sm" onClick={handleRemoveFriend}>
          <UserMinus size={14} style={{ marginRight: 6 }} />
          Remove Friend
        </Button>
      </div>

      {isLoading && <p>Loading wishlists...</p>}
      {isError && <p>Failed to load wishlists.</p>}
      {!isLoading && !isError && wishlists.length === 0 && (
        <p className={styles.empty}>This friend has no visible wishlists.</p>
      )}

      <div className={styles.grid}>
        {wishlists.map((w) => (
          <WishlistCard key={w.id} wishlist={w} />
        ))}
      </div>
    </main>
  );
}
