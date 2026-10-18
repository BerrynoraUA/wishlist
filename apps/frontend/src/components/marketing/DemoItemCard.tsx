"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./marketing.module.scss";
import { fade } from "./motion";
import { ReserveButton } from "./ReserveButton";

export type DemoPriority =
  | { kind: "star" }
  | { kind: "badge"; label: string; color: string; Icon: LucideIcon };

export type DemoItem = {
  id: string;
  name: string;
  store: string;
  price: string;
  /** One of the app's list accents: pink, blue, peach, mint, lavender. */
  accent: "pink" | "blue" | "peach" | "mint" | "lavender";
  Icon: LucideIcon;
  priority?: DemoPriority;
};

type Props = {
  item: DemoItem;
  reserved: boolean;
  onToggle: () => void;
  /** The list owner's view: no reserve control, only the note. */
  ownerNote?: string | null;
};

/** A marketing copy of the app's ItemCard: square image, medallion, reserve row. */
export function DemoItemCard({ item, reserved, onToggle, ownerNote }: Props) {
  const { Icon, priority } = item;
  const nameId = useId();

  return (
    <article className={styles.card}>
      <div className={styles.cardImage} style={{ background: `var(--accent-${item.accent})` }}>
        <Icon size={34} strokeWidth={1.75} aria-hidden="true" />
        {priority?.kind === "badge" && (
          <span
            className={styles.priorityBadge}
            style={{ borderColor: priority.color, color: priority.color }}
          >
            <priority.Icon size={10} strokeWidth={2.5} aria-hidden="true" />
            {priority.label}
          </span>
        )}
        {priority?.kind === "star" && (
          <span className={styles.priorityMedallion} aria-hidden="true">
            <Star size={14} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <h3 className={styles.cardName} id={nameId}>
        {item.name}
      </h3>
      <p className={styles.cardMeta}>
        <span>{item.store}</span>
        <span className={styles.cardPrice}>{item.price}</span>
      </p>
      <div className={styles.cardAction}>
        <AnimatePresence mode="wait" initial={false}>
          {ownerNote ? (
            <motion.p
              key="owner"
              className={styles.ownerNote}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {ownerNote}
            </motion.p>
          ) : (
            <motion.div
              key="friend"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <ReserveButton reserved={reserved} onToggle={onToggle} describedBy={nameId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
