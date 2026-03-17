"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import styles from "./DashboardHeader.module.scss";
import { Plus, Sparkles } from "lucide-react";
import { useCurrentUser, useMyStatistics } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";

function getDisplayName(nameSource?: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const metadata = (nameSource?.user_metadata ?? {}) as Record<string, unknown>;

  const rawFull = metadata.full_name ?? metadata.name;
  const rawFirst = metadata.first_name;
  const rawLast = metadata.last_name;

  const fullName =
    (typeof rawFull === "string" && rawFull) ||
    [
      typeof rawFirst === "string" ? rawFirst : undefined,
      typeof rawLast === "string" ? rawLast : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (fullName) return fullName;
  if (nameSource?.email) return nameSource.email.split("@")[0];
  return "there";
}

type Props = {
  onNewWishlist: () => void;
};

export function DashboardHeader({ onNewWishlist }: Props) {
  const { data: user } = useCurrentUser();
  const { data: stats } = useMyStatistics();
  const { isPro } = useSubscription();
  const router = useRouter();
  const displayName = getDisplayName(user ?? undefined);

  const wishlistCount = stats?.wishlists_count ?? 0;
  const atLimit = !isPro && wishlistCount >= FREE_LIMITS.maxWishlists;

  function handleNewWishlist() {
    if (atLimit) {
      router.push("/subscription");
    } else {
      onNewWishlist();
    }
  }

  return (
    <div className={styles.header}>
      <div>
        <h1>Good afternoon, {displayName}</h1>
        <p>
          Manage your wishlists and discover what your friends are wishing for.
        </p>
      </div>

      <div className={styles.actions}>
        {!isPro && (
          <span className={styles.limitCounter}>
            {wishlistCount}/{FREE_LIMITS.maxWishlists} wishlists
          </span>
        )}
        <Button size="sm" onClick={handleNewWishlist}>
          {atLimit ? (
            <>
              <Sparkles size={18} />
              <span>Upgrade to Add</span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span>Add Wishlist</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
