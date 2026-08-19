"use client";

import { useMemo, useState } from "react";
import { Check, X, Sparkles, Crown } from "lucide-react";
import { useGT } from "gt-next";
import styles from "./PricingCards.module.scss";
import { Button } from "@/components/ui/Button/Button";
import {
  useCheckout,
  useManageSubscription,
  useSubscription,
  useSubscriptionPackages,
  useSyncSubscription,
} from "@/hooks/use-subscription";
import { PRICING, BillingInterval } from "@/types/subscription";

type FreeFeature = { key: string; label: string; included: boolean };
type ProFeature = {
  key: string;
  label: string;
  included: boolean;
  highlight?: boolean;
};

export function PricingCards() {
  const t = useGT();
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.Monthly);
  const { isPro } = useSubscription();
  const checkout = useCheckout();
  const manageSubscription = useManageSubscription();
  const packagesQuery = useSubscriptionPackages();
  const syncSubscription = useSyncSubscription();

  const freeFeatures = useMemo<FreeFeature[]>(
    () => [
      {
        key: "wishlists5",
        label: t("Up to 5 wishlists", {
          $id: "subscription.pricing.free.wishlists5",
        }),
        included: true,
      },
      {
        key: "items10",
        label: t("Up to 10 items per wishlist", {
          $id: "subscription.pricing.free.items10",
        }),
        included: true,
      },
      {
        key: "scraping",
        label: t("Smart link scraping", {
          $id: "subscription.pricing.free.scraping",
        }),
        included: true,
      },
      {
        key: "friends",
        label: t("Friends & gift reservations", {
          $id: "subscription.pricing.free.friends",
        }),
        included: true,
      },
      {
        key: "notifications",
        label: t("Real-time notifications", {
          $id: "subscription.pricing.free.notifications",
        }),
        included: true,
      },
      {
        key: "discover",
        label: t("Discover & explore", {
          $id: "subscription.pricing.free.discover",
        }),
        included: true,
      },
      {
        key: "theme",
        label: t("Dark / light theme", {
          $id: "subscription.pricing.free.theme",
        }),
        included: true,
      },
      {
        key: "collab",
        label: t("Collaborative wishlists", {
          $id: "subscription.pricing.free.collab",
        }),
        included: false,
      },
      {
        key: "sharing",
        label: t("Advanced sharing (QR, PDF)", {
          $id: "subscription.pricing.free.sharing",
        }),
        included: false,
      },
      {
        key: "support",
        label: t("Priority support", {
          $id: "subscription.pricing.free.support",
        }),
        included: false,
      },
    ],
    [t],
  );

  const proFeatures = useMemo<ProFeature[]>(
    () => [
      {
        key: "unlimitedWl",
        label: t("Unlimited wishlists", {
          $id: "subscription.pricing.pro.unlimitedWl",
        }),
        included: true,
      },
      {
        key: "unlimitedItems",
        label: t("Unlimited items per wishlist", {
          $id: "subscription.pricing.pro.unlimitedItems",
        }),
        included: true,
      },
      {
        key: "scraping",
        label: t("Smart link scraping", {
          $id: "subscription.pricing.pro.scraping",
        }),
        included: true,
      },
      {
        key: "friends",
        label: t("Friends & gift reservations", {
          $id: "subscription.pricing.pro.friends",
        }),
        included: true,
      },
      {
        key: "notifications",
        label: t("Real-time notifications", {
          $id: "subscription.pricing.pro.notifications",
        }),
        included: true,
      },
      {
        key: "discover",
        label: t("Discover & explore", {
          $id: "subscription.pricing.pro.discover",
        }),
        included: true,
      },
      {
        key: "theme",
        label: t("Dark / light theme", {
          $id: "subscription.pricing.pro.theme",
        }),
        included: true,
      },
      {
        key: "collab",
        label: t("Collaborative wishlists", {
          $id: "subscription.pricing.pro.collab",
        }),
        included: true,
        highlight: true,
      },
      {
        key: "sharing",
        label: t("Advanced sharing (QR, PDF)", {
          $id: "subscription.pricing.pro.sharing",
        }),
        included: true,
        highlight: true,
      },
      {
        key: "support",
        label: t("Priority support", {
          $id: "subscription.pricing.pro.support",
        }),
        included: true,
        highlight: true,
      },
    ],
    [t],
  );

  const isMonthly = interval === BillingInterval.Monthly;
  const selectedPackage = packagesQuery.data?.find((item) => item.interval === interval);
  const monthlyPackage = packagesQuery.data?.find(
    (item) => item.interval === BillingInterval.Monthly,
  );
  const yearlyPackage = packagesQuery.data?.find(
    (item) => item.interval === BillingInterval.Yearly,
  );
  const monthlyPrice = monthlyPackage?.price ?? `$${PRICING.monthly}`;
  const yearlyPrice = yearlyPackage?.price ?? `$${PRICING.yearly}`;
  const selectedPrice = selectedPackage?.price ?? (isMonthly ? monthlyPrice : yearlyPrice);
  const selectedPricePerMonth =
    selectedPackage?.pricePerMonth ??
    (isMonthly ? monthlyPrice : `$${+(PRICING.yearly / 12).toFixed(2)}`);

  function handleUpgrade() {
    checkout.checkout(interval);
  }

  function handleRestorePurchases() {
    syncSubscription.mutate();
  }

  function handleManageSubscription() {
    manageSubscription.mutate();
  }

  return (
    <div className={styles.wrapper}>
      {/* Billing toggle */}
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleOption} ${isMonthly ? styles.active : ""}`}
          onClick={() => setInterval(BillingInterval.Monthly)}
        >
          {t("Monthly", { $id: "subscription.pricing.billingMonthly" })}
        </button>
        <button
          type="button"
          className={`${styles.toggleOption} ${!isMonthly ? styles.active : ""}`}
          onClick={() => setInterval(BillingInterval.Yearly)}
        >
          {t("Yearly", { $id: "subscription.pricing.billingYearly" })}
          <span className={styles.saveBadge}>
            {t("Save {percent}%", {
              percent: PRICING.yearlySavingsPercent,
              $id: "subscription.pricing.savePercent",
            })}
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className={styles.cards}>
        {/* Free plan */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>
              {t("Free", { $id: "subscription.pricing.planFree" })}
            </h3>
            <p className={styles.planDesc}>
              {t("Everything you need to get started with wishlists.", {
                $id: "subscription.pricing.freeDesc",
              })}
            </p>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.priceAmount}>$0</span>
            <span className={styles.pricePeriod}>
              {t("forever", { $id: "subscription.pricing.forever" })}
            </span>
          </div>

          <ul className={styles.featureList}>
            {freeFeatures.map((f) => (
              <li
                key={f.key}
                className={`${styles.featureItem} ${!f.included ? styles.disabled : ""}`}
              >
                {f.included ? (
                  <Check size={16} className={styles.checkIcon} />
                ) : (
                  <X size={16} className={styles.xIcon} />
                )}
                <span>{f.label}</span>
              </li>
            ))}
          </ul>

          {!isPro ? (
            <div className={styles.currentBadge}>
              {t("Current Plan", { $id: "subscription.pricing.currentPlan" })}
            </div>
          ) : (
            <Button variant="secondary" onClick={() => {}}>
              {t("Downgrade", { $id: "subscription.pricing.downgrade" })}
            </Button>
          )}
        </div>

        {/* Pro plan */}
        <div className={`${styles.card} ${styles.proCard}`}>
          <div className={styles.popularBadge}>
            <Crown size={14} />
            {t("Most Popular", { $id: "subscription.pricing.mostPopular" })}
          </div>

          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>
              {t("Pro", { $id: "subscription.pricing.planPro" })}{" "}
              <Sparkles size={20} className={styles.sparkle} />
            </h3>
            <p className={styles.planDesc}>
              {t("Unlock the full Wishlane experience with unlimited everything.", {
                $id: "subscription.pricing.proDesc",
              })}
            </p>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.priceAmount}>{selectedPricePerMonth}</span>
            <span className={styles.pricePeriod}>
              {t("/month", { $id: "subscription.pricing.perMonth" })}
            </span>
            {!isMonthly && (
              <span className={styles.billedAs}>
                {t("Billed as {amount}/year", {
                  amount: yearlyPrice,
                  $id: "subscription.pricing.billedYearly",
                })}
              </span>
            )}
            {isMonthly && selectedPrice !== selectedPricePerMonth && (
              <span className={styles.billedAs}>
                {t("Billed as {amount}/month", {
                  amount: selectedPrice,
                  $id: "subscription.pricing.billedMonthly",
                })}
              </span>
            )}
          </div>

          <ul className={styles.featureList}>
            {proFeatures.map((f) => (
              <li
                key={f.key}
                className={`${styles.featureItem} ${f.highlight ? styles.highlighted : ""}`}
              >
                <Check size={16} className={styles.checkIcon} />
                <span>{f.label}</span>
                {f.highlight && (
                  <span className={styles.newBadge}>
                    {t("NEW", { $id: "subscription.pricing.newBadge" })}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {isPro ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleManageSubscription}
              disabled={manageSubscription.isPending}
            >
              {manageSubscription.isPending
                ? t("Opening...", { $id: "subscription.pricing.openingManagement" })
                : t("Manage subscription", {
                    $id: "subscription.pricing.manageSubscription",
                  })}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleUpgrade}
                disabled={checkout.isPending || packagesQuery.isLoading}
              >
                {checkout.isPending
                  ? t("Opening checkout...", {
                      $id: "subscription.pricing.openingCheckout",
                    })
                  : t("Upgrade to Pro", {
                      $id: "subscription.pricing.upgradeToPro",
                    })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={styles.restoreLink}
                onClick={handleRestorePurchases}
                disabled={syncSubscription.isPending}
              >
                {syncSubscription.isPending
                  ? t("Syncing…", { $id: "subscription.pricing.syncing" })
                  : t("Sync subscription", {
                      $id: "subscription.pricing.syncSubscription",
                    })}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
