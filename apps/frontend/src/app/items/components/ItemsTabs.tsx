"use client";

import { useGT } from "gt-next";
import styles from "./ItemsTabs.module.scss";

type Props = {
  active: "add" | "preview";
  previewCount: number;
  onChange: (v: "add" | "preview") => void;
};

export function ItemsTabs({ active, previewCount, onChange }: Props) {
  const t = useGT();
  return (
    <div className={styles.tabs}>
      <button className={active === "add" ? styles.active : ""} onClick={() => onChange("add")}>
        {t("Add Link", { $id: "items.tabs.addLink" })}
      </button>

      <button
        className={active === "preview" ? styles.active : ""}
        onClick={() => onChange("preview")}
      >
        {t("Preview", { $id: "items.tabs.preview" })}{" "}
        <span className={styles.badge}>{previewCount}</span>
      </button>
    </div>
  );
}
