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
            <Sparkles size={16} />
            <span>{t("All Wishlists", { $id: "discover.filters.allWishlists" })}</span>
          </>
        ),
      },
      {
        value: "available",
        label: (
          <>
            <Sparkles size={16} />
            <span>Available</span>
          </>
        ),
      },
      {
        value: "reserved",
        label: (
          <>
            <Heart size={16} />
            <span>{t("Reserved", { $id: "discover.filters.reserved" })}</span>
          </>
        ),
      },
      {
        value: "purchased",
        label: (
          <>
            <ShoppingCart size={16} />
            <span>{t("Purchased", { $id: "discover.filters.purchased" })}</span>
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
