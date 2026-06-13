"use client";

import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import styles from "./DashboardHeader.module.scss";
import { Plus, Sparkles } from "lucide-react";
import { useCurrentUser, useMyStatistics } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { DashboardHeaderSkeleton } from "../home-skeleton/HomeSkeleton";
import { getDisplayName } from "../../helpers";
import { GREETING_FALLBACK_NAME } from "../../constants";

type Props = {
  onNewWishlist: () => void;
  hasDraft?: boolean;
};

export function DashboardHeader({ onNewWishlist, hasDraft = false }: Props) {
  const t = useGT();
  const { data: user, isPending: isUserPending } = useCurrentUser();
  const { data: stats } = useMyStatistics();
  const { isPro } = useSubscription();
  const router = useRouter();
  const wishlistCount = stats?.wishlists_count ?? 0;
  const atLimit = SUBSCRIPTIONS_UI_ENABLED && !isPro && wishlistCount >= FREE_LIMITS.maxWishlists;
  const rawDisplayName = user ? getDisplayName(user) : null;
  const displayName =
    rawDisplayName === null
      ? null
      : rawDisplayName === GREETING_FALLBACK_NAME
        ? t("there", { $id: "home.dashboard.greeting.fallbackName" })
        : rawDisplayName;

  function handleNewWishlist() {
    if (atLimit) {
      router.push("/subscription");
      return;
    }

    onNewWishlist();
  }

  if (isUserPending && !user) {
    return <DashboardHeaderSkeleton />;
  }

  return (
    <div className={styles.header}>
      <div>
        <h1>
          {displayName
            ? t("Good afternoon, {name}", {
                name: displayName,
                $id: "home.dashboard.greeting",
              })
            : isUserPending
              ? "\u00A0"
              : t("Good afternoon, {name}", {
                  name: t("there", {
                    $id: "home.dashboard.greeting.fallbackName",
                  }),
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
        <Button size="sm" onClick={handleNewWishlist} data-guide-target="home-add-wishlist">
          {atLimit ? (
            <>
              <Sparkles size={18} />
              <span>{t("Upgrade to Add", { $id: "home.dashboard.upgradeToAdd" })}</span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span>{t("Add Wishlist", { $id: "home.dashboard.addWishlist" })}</span>
              {hasDraft && <DraftBadge variant="dot" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
