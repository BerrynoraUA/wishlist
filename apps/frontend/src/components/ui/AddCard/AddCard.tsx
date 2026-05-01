"use client";

import { Plus } from "lucide-react";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import styles from "./AddCard.module.scss";

type Props = {
  onClick: () => void;
  label: string;
  hasDraft?: boolean;
};

export function AddCard({ onClick, label, hasDraft = false }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {hasDraft && <DraftBadge variant="dot" className={styles.draftDot} />}
      <span className={styles.plus} aria-hidden="true">
        <Plus strokeWidth={1.25} />
      </span>
    </button>
  );
}
