"use client";

import { useGT } from "gt-next";
import styles from "./LoginHeader.module.scss";

export function LoginHeader() {
  const t = useGT();
  return (
    <div className={styles.header}>
      <div>
        <h1>{t("Welcome back", { $id: "login.header.title" })}</h1>
      </div>
    </div>
  );
}
