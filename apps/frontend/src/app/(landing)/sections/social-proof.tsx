"use client";

import { useGT } from "gt-next";
import styles from "../landing.module.scss";
import { StatItem } from "./shared";

export function SocialProof() {
  const t = useGT();

  return (
    <section className={styles.statsBar}>
      <div className={`${styles.container} ${styles.statsBarInner}`}>
        <StatItem
          count={10000}
          suffix="+"
          label={t("Wishlists Created", { $id: "landing.stats.wishlistsCreated" })}
        />
        <StatItem
          count={50000}
          suffix="+"
          label={t("Gifts Tracked", { $id: "landing.stats.giftsTracked" })}
          delay={100}
        />
        <StatItem
          count={25000}
          suffix="+"
          label={t("Items Reserved", { $id: "landing.stats.itemsReserved" })}
          delay={200}
        />
        <StatItem
          count={98}
          suffix="%"
          label={t("Happy Gift-Givers", { $id: "landing.stats.happyGiftGivers" })}
          delay={300}
        />
      </div>
    </section>
  );
}
