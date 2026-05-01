"use client";

import { Sun, Moon } from "lucide-react";
import { useGT } from "gt-next";
import styles from "./ThemeToggle.module.scss";
import { useAppTheme } from "@/providers";

export function ThemeToggle() {
  const t = useGT();
  const { resolvedTheme, setPersistedTheme } = useAppTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      className={styles.toggle}
      onClick={() => setPersistedTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark
          ? t("Switch to light mode", { $id: "theme.switchLight" })
          : t("Switch to dark mode", { $id: "theme.switchDark" })
      }
    >
      <span className={`${styles.iconWrap} ${isDark ? styles.dark : styles.light}`}>
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
    </button>
  );
}
