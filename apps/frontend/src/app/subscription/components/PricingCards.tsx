"use client";

import { useState } from "react";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  TrendingDown,
  Users,
  Share2,
  Headphones,
} from "lucide-react";
import styles from "./PricingCards.module.scss";
import { Button } from "@/components/ui/Button/Button";
import {
  useSubscription,
  useCheckout,
  useSyncSubscription,
} from "@/hooks/use-subscription";
import { PRICING, BillingInterval } from "@/types/subscription";

const FREE_FEATURES = [
  { label: "Up to 5 wishlists", included: true },
  { label: "Up to 20 items per wishlist", included: true },
  { label: "Smart link scraping", included: true },
  { label: "Friends & gift reservations", included: true },
  { label: "Real-time notifications", included: true },
  { label: "Discover & explore", included: true },
  { label: "Dark / light theme", included: true },
  { label: "Sale price alerts", included: false },
  { label: "Price tracking & history", included: false },
  { label: "Collaborative wishlists", included: false },
  { label: "Advanced sharing (QR, PDF)", included: false },
  { label: "Priority support", included: false },
];

const PRO_FEATURES = [
  { label: "Unlimited wishlists", included: true, icon: Sparkles },
  { label: "Unlimited items per wishlist", included: true, icon: Zap },
  { label: "Smart link scraping", included: true },
  { label: "Friends & gift reservations", included: true },
  { label: "Real-time notifications", included: true },
  { label: "Discover & explore", included: true },
  { label: "Dark / light theme", included: true },
  {
    label: "Sale price alerts",
    included: true,
    highlight: true,
    icon: TrendingDown,
  },
  {
    label: "Price tracking & history",
    included: true,
    highlight: true,
    icon: TrendingDown,
  },
  {
    label: "Collaborative wishlists",
    included: true,
    highlight: true,
    icon: Users,
  },
  {
    label: "Advanced sharing (QR, PDF)",
    included: true,
    highlight: true,
    icon: Share2,
  },
  {
    label: "Priority support",
    included: true,
    highlight: true,
    icon: Headphones,
  },
];

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>(
    BillingInterval.Monthly,
  );
  const { isPro } = useSubscription();
  const { checkout } = useCheckout();
  const syncSubscription = useSyncSubscription();

  const isMonthly = interval === BillingInterval.Monthly;
  const perMonth = isMonthly
    ? PRICING.monthly
    : +(PRICING.yearly / 12).toFixed(2);

  function handleUpgrade() {
    checkout(interval);
  }

  function handleRestorePurchases() {
    syncSubscription.mutate();
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
          Monthly
        </button>
        <button
          type="button"
          className={`${styles.toggleOption} ${!isMonthly ? styles.active : ""}`}
          onClick={() => setInterval(BillingInterval.Yearly)}
        >
          Yearly
          <span className={styles.saveBadge}>
            Save {PRICING.yearlySavingsPercent}%
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className={styles.cards}>
        {/* Free plan */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>Free</h3>
            <p className={styles.planDesc}>
              Everything you need to get started with wishlists.
            </p>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.priceAmount}>$0</span>
            <span className={styles.pricePeriod}>forever</span>
          </div>

          <ul className={styles.featureList}>
            {FREE_FEATURES.map((f) => (
              <li
                key={f.label}
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
            <div className={styles.currentBadge}>Current Plan</div>
          ) : (
            <Button variant="secondary" onClick={() => {}}>
              Downgrade
            </Button>
          )}
        </div>

        {/* Pro plan */}
        <div className={`${styles.card} ${styles.proCard}`}>
          <div className={styles.popularBadge}>
            <Crown size={14} />
            Most Popular
          </div>

          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>
              Pro <Sparkles size={20} className={styles.sparkle} />
            </h3>
            <p className={styles.planDesc}>
              Unlock the full Wishly experience with unlimited everything.
            </p>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.priceAmount}>
              ${isMonthly ? PRICING.monthly : perMonth}
            </span>
            <span className={styles.pricePeriod}>/month</span>
            {!isMonthly && (
              <span className={styles.billedAs}>
                Billed as ${PRICING.yearly}/year
              </span>
            )}
          </div>

          <ul className={styles.featureList}>
            {PRO_FEATURES.map((f) => (
              <li
                key={f.label}
                className={`${styles.featureItem} ${f.highlight ? styles.highlighted : ""}`}
              >
                <Check size={16} className={styles.checkIcon} />
                <span>{f.label}</span>
                {f.highlight && <span className={styles.newBadge}>NEW</span>}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className={styles.currentBadge}>Current Plan</div>
          ) : (
            <>
              <Button variant="primary" onClick={handleUpgrade}>
                Upgrade to Pro
              </Button>
              <button
                type="button"
                className={styles.restoreLink}
                onClick={handleRestorePurchases}
                disabled={syncSubscription.isPending}
              >
                {syncSubscription.isPending
                  ? "Syncing…"
                  : "Already purchased? Restore"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
