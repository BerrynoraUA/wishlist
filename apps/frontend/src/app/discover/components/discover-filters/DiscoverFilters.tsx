"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import styles from "./DiscoverFilters.module.scss";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";
import { Sparkles, Heart, ShoppingCart } from "lucide-react";

type Props = {
  active: "wishlists" | "available" | "reserved" | "purchased";
  onChange: (v: "wishlists" | "available" | "reserved" | "purchased") => void;
};

export function DiscoverFilters({ active, onChange }: Props) {
  const t = useGT();

  const items = useMemo<TabItem<"wishlists" | "available" | "reserved" | "purchased">[]>(
    () => [
      {
        value: "wishlists",
        label: (
          <>
            <Sparkles size={16} className={styles.icon} />
            <span className={`${styles.label} ${styles.fullLabel}`}>
              {t("All Wishlists", { $id: "discover.filters.allWishlists" })}
            </span>
            <span className={`${styles.label} ${styles.compactLabel}`}>
              {t("Wishlists", { $id: "discover.filters.wishlistsCompact" })}
            </span>
          </>
        ),
      },
      {
        value: "available",
        label: (
          <>
            <Sparkles size={16} className={styles.icon} />
            <span className={styles.label}>Available</span>
          </>
        ),
      },
      {
        value: "reserved",
        label: (
          <>
            <Heart size={16} className={styles.icon} />
            <span className={styles.label}>
              {t("Reserved", { $id: "discover.filters.reserved" })}
            </span>
          </>
        ),
      },
      {
        value: "purchased",
        label: (
          <>
            <ShoppingCart size={16} className={styles.icon} />
            <span className={styles.label}>
              {t("Purchased", { $id: "discover.filters.purchased" })}
            </span>
          </>
        ),
      },
    ],
    [t],
  );

  return (
    <Tabs
      items={items}
      active={active}
      onChange={onChange}
      className={styles.filters}
      tabClassName={styles.filterTab}
      activeTabClassName={styles.active}
    />
  );
}
