"use client";

import type { ReactNode } from "react";
import styles from "./Tabs.module.scss";

export type TabItem<T extends string = string> = {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
  guideTarget?: string;
};

type Props<T extends string> = {
  items: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  as?: "div" | "nav";
  ariaLabel?: string;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
};

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  size = "sm",
  as: Tag = "div",
  ariaLabel,
  className,
  tabClassName,
  activeTabClassName,
}: Props<T>) {
  return (
    <Tag
      className={`${styles.tabs} ${styles[size]} ${className ?? ""}`}
      {...(Tag === "nav" && ariaLabel ? { "aria-label": ariaLabel } : {})}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`${styles.tab} ${tabClassName ?? ""} ${active === item.value ? `${styles.active} ${activeTabClassName ?? ""}` : ""}`}
          onClick={() => onChange(item.value)}
          data-guide-target={item.guideTarget}
        >
          {item.label}
          {item.badge !== undefined && <span className={styles.badge}>{item.badge}</span>}
        </button>
      ))}
    </Tag>
  );
}
