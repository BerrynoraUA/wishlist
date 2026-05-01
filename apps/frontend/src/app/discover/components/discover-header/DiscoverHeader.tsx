"use client";

import { useGT } from "gt-next";
import styles from "./DiscoverHeader.module.scss";

export function DiscoverHeader() {
  const t = useGT();
  return (
    <div className={styles.header}>
      <h1>{t("Discover", { $id: "discover.header.title" })}</h1>
      <p>
        {t("Browse your friends' wishlists and find the perfect gifts.", {
          $id: "discover.header.subtitle",
        })}
      </p>
    </div>
  );
}
