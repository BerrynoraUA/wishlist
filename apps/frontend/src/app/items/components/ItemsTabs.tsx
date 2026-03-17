"use client";

import styles from "./ItemsTabs.module.scss";

type Props = {
  active: "add" | "preview";
  previewCount: number;
  onChange: (v: "add" | "preview") => void;
};

export function ItemsTabs({ active, previewCount, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      <button
        className={active === "add" ? styles.active : ""}
        onClick={() => onChange("add")}
      >
        Add Link
      </button>

      <button
        className={active === "preview" ? styles.active : ""}
        onClick={() => onChange("preview")}
      >
        Preview <span className={styles.badge}>{previewCount}</span>
      </button>
    </div>
  );
}
