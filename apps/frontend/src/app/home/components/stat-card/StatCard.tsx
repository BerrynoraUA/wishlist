"use client";

import { useGT } from "gt-next";
import styles from "./StatCard.module.scss";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  onClick?: () => void;
};

export function StatCard({ label, value, icon: Icon, onClick }: Props) {
  const t = useGT();
  const content = (
    <>
      <div className={styles.iconWrapper}>
        <Icon size={18} />
      </div>

      <div className={styles.text}>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.interactive}`}
        onClick={onClick}
        aria-label={t("Open {label} in discover", {
          label,
          $id: "home.stats.aria.openInDiscover",
        })}
      >
        {content}
      </button>
    );
  }

  return <div className={styles.card}>{content}</div>;
}
