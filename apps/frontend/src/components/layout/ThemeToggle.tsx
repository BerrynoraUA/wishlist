"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.scss";
import { useAppTheme } from "@/providers";

export function ThemeToggle() {
  const { resolvedTheme, setTemporaryTheme } = useAppTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={styles.toggle} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      className={styles.toggle}
      onClick={() => setTemporaryTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span
        className={`${styles.iconWrap} ${isDark ? styles.dark : styles.light}`}
      >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
    </button>
  );
}
