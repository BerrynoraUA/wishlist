"use client";

import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import styles from "./DashboardHeader.module.scss";
import { Plus, Sparkles } from "lucide-react";
import { useCurrentUser, useMyStatistics } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

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
  const t = useGT();
  const { data: user } = useCurrentUser();
  const { data: stats } = useMyStatistics();
  const { isPro } = useSubscription();
  const router = useRouter();
  const wishlistCount = stats?.wishlists_count ?? 0;
  const atLimit = SUBSCRIPTIONS_UI_ENABLED && !isPro && wishlistCount >= FREE_LIMITS.maxWishlists;
  const rawDisplayName = getDisplayName(user ?? undefined);
  const displayName =
    rawDisplayName === "there"
      ? t("there", { $id: "home.dashboard.greeting.fallbackName" })
      : rawDisplayName;

  function handleNewWishlist() {
    if (atLimit) {
      router.push("/subscription");
      return;
    }

    onNewWishlist();
  }

  return (
    <div className={styles.header}>
      <div>
        <h1>
          {t("Good afternoon, {name}", {
            name: displayName,
            $id: "home.dashboard.greeting",
          })}
        </h1>
        <p>
          {t("Manage your wishlists and discover what your friends are wishing for.", {
            $id: "home.dashboard.subtitle",
          })}
        </p>
      </div>

      <div className={styles.actions}>
        {SUBSCRIPTIONS_UI_ENABLED && !isPro && (
          <span className={styles.limitCounter}>
            {t("{current}/{max} wishlists", {
              current: wishlistCount,
              max: FREE_LIMITS.maxWishlists,
              $id: "home.dashboard.wishlistLimit",
            })}
          </span>
        )}
        <Button size="sm" onClick={handleNewWishlist}>
          {atLimit ? (
            <>
              <Sparkles size={18} />
              <span>{t("Upgrade to Add", { $id: "home.dashboard.upgradeToAdd" })}</span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span>{t("Add Wishlist", { $id: "home.dashboard.addWishlist" })}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
