"use client";

import { Plus } from "lucide-react";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import styles from "./AddCard.module.scss";

type Props = {
  onClick: () => void;
  label: string;
  hasDraft?: boolean;
  guideTarget?: string;
};

export function AddCard({ onClick, label, hasDraft = false, guideTarget }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={label}
      title={label}
      data-guide-target={guideTarget}
    >
      {hasDraft && <DraftBadge variant="dot" className={styles.draftDot} />}
      <span className={styles.plus} aria-hidden="true">
        <Plus strokeWidth={1.25} />
      </span>
    </button>
  );
}
