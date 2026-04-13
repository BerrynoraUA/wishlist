"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import { ChevronDown, Check, X } from "lucide-react";
import styles from "./FeatureComparison.module.scss";

type Row = {
  key: string;
  feature: string;
  free: boolean | string;
  pro: boolean | string;
};

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className={styles.textValue}>{value}</span>;
  }
  return value ? (
    <Check size={18} className={styles.checkIcon} />
  ) : (
    <X size={18} className={styles.xIcon} />
  );
}

export function FeatureComparison() {
  const t = useGT();
  const [open, setOpen] = useState(false);

  const rows = useMemo<Row[]>(
    () => [
      {
        key: "wishlists",
        feature: t("Wishlists", { $id: "subscription.compare.wishlists" }),
        free: t("Up to 5", { $id: "subscription.compare.upTo5" }),
        pro: t("Unlimited", { $id: "subscription.compare.unlimited" }),
      },
      {
        key: "items",
        feature: t("Items per wishlist", {
          $id: "subscription.compare.itemsPerWishlist",
        }),
        free: t("Up to 20", { $id: "subscription.compare.upTo20" }),
        pro: t("Unlimited", { $id: "subscription.compare.unlimitedItems" }),
      },
      {
        key: "scraping",
        feature: t("Smart link scraping", {
          $id: "subscription.compare.scraping",
        }),
        free: true,
        pro: true,
      },
      {
        key: "friends",
        feature: t("Friends & reservations", {
          $id: "subscription.compare.friends",
        }),
        free: true,
        pro: true,
      },
      {
        key: "notifications",
        feature: t("Real-time notifications", {
          $id: "subscription.compare.notifications",
        }),
        free: true,
        pro: true,
      },
      {
        key: "discover",
        feature: t("Discover & explore", {
          $id: "subscription.compare.discover",
        }),
        free: true,
        pro: true,
      },
      {
        key: "theme",
        feature: t("Dark / light theme", {
          $id: "subscription.compare.theme",
        }),
        free: true,
        pro: true,
      },
      {
        key: "saleAlerts",
        feature: t("Sale price alerts", {
          $id: "subscription.compare.saleAlerts",
        }),
        free: false,
        pro: true,
      },
      {
        key: "priceHistory",
        feature: t("Price tracking & history", {
          $id: "subscription.compare.priceHistory",
        }),
        free: false,
        pro: true,
      },
      {
        key: "collab",
        feature: t("Collaborative wishlists", {
          $id: "subscription.compare.collab",
        }),
        free: false,
        pro: true,
      },
      {
        key: "sharing",
        feature: t("Advanced sharing (QR, PDF)", {
          $id: "subscription.compare.sharing",
        }),
        free: false,
        pro: true,
      },
      {
        key: "support",
        feature: t("Priority support", {
          $id: "subscription.compare.support",
        }),
        free: false,
        pro: true,
      },
    ],
    [t],
  );

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <span>
          {t("Full feature comparison", {
            $id: "subscription.compare.trigger",
          })}
        </span>
        <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.rotated : ""}`} />
      </button>

      {open && (
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headerRow}`}>
            <div className={styles.featureCol}>
              {t("Feature", { $id: "subscription.compare.colFeature" })}
            </div>
            <div className={styles.planCol}>
              {t("Free", { $id: "subscription.compare.colFree" })}
            </div>
            <div className={`${styles.planCol} ${styles.proCol}`}>
              {t("Pro", { $id: "subscription.compare.colPro" })}
            </div>
          </div>

          {rows.map((row) => (
            <div key={row.key} className={styles.row}>
              <div className={styles.featureCol}>{row.feature}</div>
              <div className={styles.planCol}>
                <CellValue value={row.free} />
              </div>
              <div className={`${styles.planCol} ${styles.proCol}`}>
                <CellValue value={row.pro} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
