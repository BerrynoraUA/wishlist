"use client";

import { useGT } from "gt-next";
import styles from "./DiscoverFilters.module.scss";
import { Sparkles, Heart, ShoppingCart } from "lucide-react";

type Props = {
  active: "wishlists" | "reserved" | "purchased";
  onChange: (v: "wishlists" | "reserved" | "purchased") => void;
};

export function DiscoverFilters({ active, onChange }: Props) {
  const t = useGT();
  return (
    <div className={styles.filters}>
      <button
        className={active === "wishlists" ? styles.active : ""}
        onClick={() => onChange("wishlists")}
      >
        <Sparkles size={16} />
        <span>
          {t("All Wishlists", { $id: "discover.filters.allWishlists" })}
        </span>
      </button>
      <button
        className={active === "reserved" ? styles.active : ""}
        onClick={() => onChange("reserved")}
      >
        <Heart size={16} />
        <span>{t("Reserved", { $id: "discover.filters.reserved" })}</span>
      </button>
      <button
        className={active === "purchased" ? styles.active : ""}
        onClick={() => onChange("purchased")}
      >
        <ShoppingCart size={16} />
        <span>{t("Purchased", { $id: "discover.filters.purchased" })}</span>
      </button>
    </div>
  );
}
