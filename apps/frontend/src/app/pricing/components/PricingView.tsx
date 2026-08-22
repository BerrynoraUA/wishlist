"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGT } from "gt-next";
import { Check, X, Crown, Sparkles } from "lucide-react";
import { PRICING, BillingInterval } from "@/types/subscription";
import styles from "../pricing.module.scss";

type Feature = { key: string; label: string; included: boolean; highlight?: boolean };

export function PricingView() {
  const t = useGT();
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.Monthly);
  const isMonthly = interval === BillingInterval.Monthly;

  const freeFeatures = useMemo<Feature[]>(
    () => [
      {
        key: "wishlists5",
        label: t("Up to 5 wishlists", { $id: "pricing.free.wishlists5" }),
        included: true,
      },
      {
        key: "items10",
        label: t("Up to 10 items per wishlist", { $id: "pricing.free.items10" }),
        included: true,
      },
      {
        key: "scraping",
        label: t("Smart link scraping", { $id: "pricing.free.scraping" }),
        included: true,
      },
      {
        key: "friends",
        label: t("Friends & gift reservations", { $id: "pricing.free.friends" }),
        included: true,
      },
      {
        key: "notifications",
        label: t("Real-time notifications", { $id: "pricing.free.notifications" }),
        included: true,
      },
      {
        key: "discover",
        label: t("Discover & explore", { $id: "pricing.free.discover" }),
        included: true,
      },
      {
        key: "theme",
        label: t("Dark / light theme", { $id: "pricing.free.theme" }),
        included: true,
      },
      {
        key: "collab",
        label: t("Collaborative wishlists", { $id: "pricing.free.collab" }),
        included: false,
      },
      {
        key: "sharing",
        label: t("Advanced sharing (QR, PDF)", { $id: "pricing.free.sharing" }),
        included: false,
      },
      {
        key: "support",
        label: t("Priority support", { $id: "pricing.free.support" }),
        included: false,
      },
    ],
    [t],
  );

  const proFeatures = useMemo<Feature[]>(
    () => [
      {
        key: "unlimitedWl",
        label: t("Unlimited wishlists", { $id: "pricing.pro.unlimitedWl" }),
        included: true,
      },
      {
        key: "unlimitedItems",
        label: t("Unlimited items per wishlist", { $id: "pricing.pro.unlimitedItems" }),
        included: true,
      },
      {
        key: "scraping",
        label: t("Smart link scraping", { $id: "pricing.pro.scraping" }),
        included: true,
      },
      {
        key: "friends",
        label: t("Friends & gift reservations", { $id: "pricing.pro.friends" }),
        included: true,
      },
      {
        key: "notifications",
        label: t("Real-time notifications", { $id: "pricing.pro.notifications" }),
        included: true,
      },
      {
        key: "discover",
        label: t("Discover & explore", { $id: "pricing.pro.discover" }),
        included: true,
      },
      {
        key: "theme",
        label: t("Dark / light theme", { $id: "pricing.pro.theme" }),
        included: true,
      },
      {
        key: "collab",
        label: t("Collaborative wishlists", { $id: "pricing.pro.collab" }),
        included: true,
        highlight: true,
      },
      {
        key: "sharing",
        label: t("Advanced sharing (QR, PDF)", { $id: "pricing.pro.sharing" }),
        included: true,
        highlight: true,
      },
      {
        key: "support",
        label: t("Priority support", { $id: "pricing.pro.support" }),
        included: true,
        highlight: true,
      },
    ],
    [t],
  );

  const monthlyPrice = `$${PRICING.monthly}`;
  const yearlyPrice = `$${PRICING.yearly}`;
  const proPerMonth = isMonthly ? monthlyPrice : `$${+(PRICING.yearly / 12).toFixed(2)}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>♡</span>
          {t("Wishlane", { $id: "pricing.brand" })}
        </Link>
        <Link href="/login" className={styles.signIn}>
          {t("Sign in", { $id: "pricing.signIn" })}
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{t("Simple, honest pricing", { $id: "pricing.title" })}</h1>
          <p className={styles.subtitle}>
            {t("Start free. Upgrade to Pro when you want unlimited everything.", {
              $id: "pricing.subtitle",
            })}
          </p>
        </div>

        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleOption} ${isMonthly ? styles.toggleActive : ""}`}
            onClick={() => setInterval(BillingInterval.Monthly)}
          >
            {t("Monthly", { $id: "pricing.billingMonthly" })}
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${!isMonthly ? styles.toggleActive : ""}`}
            onClick={() => setInterval(BillingInterval.Yearly)}
          >
            {t("Yearly", { $id: "pricing.billingYearly" })}
            <span className={styles.saveBadge}>
              {t("Save {percent}%", {
                percent: PRICING.yearlySavingsPercent,
                $id: "pricing.savePercent",
              })}
            </span>
          </button>
        </div>

        <div className={styles.cards}>
          {/* Free */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.planName}>{t("Free", { $id: "pricing.planFree" })}</h2>
              <p className={styles.planDesc}>
                {t("Everything you need to get started with wishlists.", {
                  $id: "pricing.freeDesc",
                })}
              </p>
            </div>

            <div className={styles.priceBlock}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>{t("forever", { $id: "pricing.forever" })}</span>
            </div>

            <Link href="/register" className={`${styles.cta} ${styles.ctaSecondary}`}>
              {t("Get started", { $id: "pricing.getStarted" })}
            </Link>

            <ul className={styles.featureList}>
              {freeFeatures.map((f) => (
                <li
                  key={f.key}
                  className={`${styles.featureItem} ${!f.included ? styles.featureDisabled : ""}`}
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
          </section>

          {/* Pro */}
          <section className={`${styles.card} ${styles.proCard}`}>
            <div className={styles.popularBadge}>
              <Crown size={14} />
              {t("Most Popular", { $id: "pricing.mostPopular" })}
            </div>

            <div className={styles.cardHeader}>
              <h2 className={styles.planName}>
                {t("Pro", { $id: "pricing.planPro" })}
                <Sparkles size={18} className={styles.sparkle} />
              </h2>
              <p className={styles.planDesc}>
                {t("Unlock the full Wishlane experience with unlimited everything.", {
                  $id: "pricing.proDesc",
                })}
              </p>
            </div>

            <div className={styles.priceBlock}>
              <span className={styles.priceAmount}>{proPerMonth}</span>
              <span className={styles.pricePeriod}>{t("/month", { $id: "pricing.perMonth" })}</span>
              {isMonthly ? (
                <span className={styles.billedAs}>
                  {t("Billed monthly", { $id: "pricing.billedMonthly" })}
                </span>
              ) : (
                <span className={styles.billedAs}>
                  {t("Billed as {amount}/year", {
                    amount: yearlyPrice,
                    $id: "pricing.billedYearly",
                  })}
                </span>
              )}
            </div>

            <Link href="/register" className={`${styles.cta} ${styles.ctaPrimary}`}>
              {t("Upgrade to Pro", { $id: "pricing.upgradeToPro" })}
            </Link>

            <ul className={styles.featureList}>
              {proFeatures.map((f) => (
                <li
                  key={f.key}
                  className={`${styles.featureItem} ${f.highlight ? styles.featureHighlight : ""}`}
                >
                  <Check size={16} className={styles.checkIcon} />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className={styles.finePrint}>
          {t(
            "Prices in USD. Taxes may apply. Cancel anytime — your Pro benefits stay active until the end of the billing period.",
            { $id: "pricing.finePrint" },
          )}
        </p>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          © {t("Wishlane", { $id: "pricing.footerBrand" })}
        </span>
        <nav className={styles.footerLinks}>
          <Link href="/terms-of-service">{t("Terms", { $id: "pricing.footerTerms" })}</Link>
          <Link href="/refund-policy">{t("Refunds", { $id: "pricing.footerRefunds" })}</Link>
          <Link href="/privacy-policy">{t("Privacy", { $id: "pricing.footerPrivacy" })}</Link>
        </nav>
      </footer>
    </div>
  );
}
