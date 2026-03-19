"use client";

import styles from "./DiscoverFilters.module.scss";
import { Sparkles, Heart, ShoppingCart } from "lucide-react";

type Props = {
  active: "wishlists" | "reserved" | "purchased";
  onChange: (v: "wishlists" | "reserved" | "purchased") => void;
};

export function DiscoverFilters({ active, onChange }: Props) {
  return (
    <div className={styles.filters}>
      <button
        className={active === "wishlists" ? styles.active : ""}
        onClick={() => onChange("wishlists")}
      >
        <Sparkles size={16} />
        <span>All Wishlists</span>
      </button>
      <button
        className={active === "reserved" ? styles.active : ""}
        onClick={() => onChange("reserved")}
      >
        <Heart size={16} />
        <span>Reserved</span>
      </button>
      <button
        className={active === "purchased" ? styles.active : ""}
        onClick={() => onChange("purchased")}
      >
        <ShoppingCart size={16} />
        <span>Purchased</span>
      </button>
    </div>
  );
}
