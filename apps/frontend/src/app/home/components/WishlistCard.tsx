"use client";

import { useRouter } from "next/navigation";
import styles from "./WishlistCard.module.scss";
import { Wishlist } from "@/types/wishlist";
import { Gift } from "lucide-react";
import {
  accentClass,
  visibilityIcon,
  visibilityLabel,
} from "@/lib/helpers/wishlist-helper";

export function WishlistCard({ wishlist }: { wishlist: Wishlist }) {
  const router = useRouter();

  const accent = accentClass[wishlist.accent_type] ?? "pink";
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = visibilityIcon[visibility];
  const itemsCount = wishlist.itemsCount ?? 0;

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/wishlist/${wishlist.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className={`${styles.top} ${styles[accent]}`}>
        <Gift size={40} className={styles.icon} />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{wishlist.title}</h3>

        <div className={styles.meta}>
          <span className={styles.items}>{itemsCount} items</span>

          <span className={styles.visibility}>
            <VisibilityIcon size={14} />
            {visibilityLabel[visibility]}
          </span>
        </div>
      </div>
    </div>
  );
}
