"use client";

import { useState } from "react";
import { DemoItemCard } from "./DemoItemCard";
import type { DemoItem } from "./DemoItemCard";
import { ViewToggle } from "./ViewToggle";
import styles from "./marketing.module.scss";

type View = "owner" | "friends";

type Props = {
  title: string;
  meta: string;
  accent: DemoItem["accent"];
  items: DemoItem[];
  initialReserved?: string[];
  toggleLabel: string;
  ownerLabel: string;
  friendsLabel: string;
  ownerNote: string;
  className?: string;
};

/**
 * A wishlist as the app draws it, with a switch between the owner's view
 * (no reservations visible) and a friend's view (reserve with the lock).
 */
export function WishlistDemo({
  title,
  meta,
  accent,
  items,
  initialReserved = [],
  toggleLabel,
  ownerLabel,
  friendsLabel,
  ownerNote,
  className,
}: Props) {
  const [view, setView] = useState<View>("friends");
  const [reserved, setReserved] = useState<ReadonlySet<string>>(() => new Set(initialReserved));

  const toggleReserved = (id: string) => {
    setReserved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={[styles.demo, className].filter(Boolean).join(" ")}>
      <div className={styles.demoHead}>
        <div className={styles.demoList}>
          <span
            className={styles.demoSwatch}
            style={{ background: `var(--accent-${accent})` }}
            aria-hidden="true"
          />
          <div>
            <p className={styles.demoTitle}>{title}</p>
            <p className={styles.demoMeta}>{meta}</p>
          </div>
        </div>
        <ViewToggle<View>
          label={toggleLabel}
          value={view}
          onChange={setView}
          options={[
            { value: "owner", label: ownerLabel },
            { value: "friends", label: friendsLabel },
          ]}
        />
      </div>
      <div className={styles.demoGrid} data-count={items.length}>
        {items.map((item) => (
          <DemoItemCard
            key={item.id}
            item={item}
            reserved={reserved.has(item.id)}
            onToggle={() => toggleReserved(item.id)}
            ownerNote={view === "owner" ? ownerNote : null}
          />
        ))}
      </div>
    </div>
  );
}
