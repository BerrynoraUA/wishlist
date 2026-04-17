"use client";

import { Plus } from "lucide-react";
import styles from "./AddCard.module.scss";

type Props = {
  onClick: () => void;
  label: string;
};

export function AddCard({ onClick, label }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className={styles.plus} aria-hidden="true">
        <Plus strokeWidth={1.25} />
      </span>
    </button>
  );
}
