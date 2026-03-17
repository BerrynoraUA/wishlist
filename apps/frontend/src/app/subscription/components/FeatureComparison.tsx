"use client";

import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import styles from "./FeatureComparison.module.scss";

const ROWS = [
  { feature: "Wishlists", free: "Up to 5", pro: "Unlimited" },
  { feature: "Items per wishlist", free: "Up to 20", pro: "Unlimited" },
  { feature: "Smart link scraping", free: true, pro: true },
  { feature: "Friends & reservations", free: true, pro: true },
  { feature: "Real-time notifications", free: true, pro: true },
  { feature: "Discover & explore", free: true, pro: true },
  { feature: "Dark / light theme", free: true, pro: true },
  { feature: "Sale price alerts", free: false, pro: true },
  { feature: "Price tracking & history", free: false, pro: true },
  { feature: "Collaborative wishlists", free: false, pro: true },
  { feature: "Advanced sharing (QR, PDF)", free: false, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

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
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Full feature comparison</span>
        <ChevronDown
          size={18}
          className={`${styles.chevron} ${open ? styles.rotated : ""}`}
        />
      </button>

      {open && (
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headerRow}`}>
            <div className={styles.featureCol}>Feature</div>
            <div className={styles.planCol}>Free</div>
            <div className={`${styles.planCol} ${styles.proCol}`}>Pro</div>
          </div>

          {ROWS.map((row) => (
            <div key={row.feature} className={styles.row}>
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
