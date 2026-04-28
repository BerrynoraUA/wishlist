"use client";

import { useGT } from "gt-next";
import Link from "next/link";
import styles from "../landing.module.scss";
import { DiscoverCard, SectionHeader } from "./shared";

export function Discover() {
  const t = useGT();

  return (
    <section className={styles.discover} id="discover">
      <div className={styles.container}>
        <SectionHeader
          badge={t("Discover", { $id: "landing.discover.badge" })}
          title={
            <>
              {t("Find the", { $id: "landing.discover.titlePart1" })}{" "}
              <em>{t("perfect gift", { $id: "landing.discover.titleEmphasis" })}</em>
              {t(", every time", { $id: "landing.discover.titlePart2" })}
            </>
          }
          subtitle={t(
            "Explore your friends' wishlists, see upcoming events, and never show up empty-handed.",
            { $id: "landing.discover.subtitle" },
          )}
        />
        <div className={`${styles.discoverShowcase} ${styles.animateIn}`}>
          <div className={styles.discoverEventBanner}>
            <div className={styles.discoverEventIcon}>Event</div>
            <div className={styles.discoverEventText}>
              <strong>{t("Alex's Birthday", { $id: "landing.discover.eventName" })}</strong>{" "}
              {t("is in", { $id: "landing.discover.isIn" })}{" "}
              <span className={styles.discoverEventCountdown}>
                {t("{count} days", { count: 12, $id: "landing.discover.countdown" })}
              </span>
            </div>
            <Link href="/register" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}>
              {t("View Wishlist", { $id: "landing.discover.viewWishlist" })}
            </Link>
          </div>
          <div className={styles.discoverGrid}>
            <DiscoverCard
              gradient="linear-gradient(135deg, #fde7f3, #fce7f3)"
              emoji="Sneakers"
              store="Nike.com"
              title={t("Air Jordan 1 Retro", { $id: "landing.discover.card1.title" })}
              price="$180.00"
              priority="high"
            />
            <DiscoverCard
              gradient="linear-gradient(135deg, #e0f2fe, #bfdbfe)"
              emoji="Controller"
              store="Amazon.com"
              title={t("PS5 DualSense Controller", { $id: "landing.discover.card2.title" })}
              price="$69.99"
              priority="med"
              delay={100}
            />
            <DiscoverCard
              gradient="linear-gradient(135deg, #fef3c7, #fde68a)"
              emoji="Candle"
              store="Diptyque.com"
              title={t("Baies Scented Candle", { $id: "landing.discover.card3.title" })}
              price="$76.00"
              priority="low"
              delay={200}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
