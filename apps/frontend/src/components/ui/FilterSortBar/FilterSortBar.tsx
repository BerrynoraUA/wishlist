"use client";

import type { ReactNode } from "react";
import styles from "./FilterSortBar.module.scss";

type Props = {
  children: ReactNode;
  className?: string;
};

export function FilterSortBar({ children, className }: Props) {
  return <div className={`${styles.bar} ${className ?? ""}`}>{children}</div>;
}

export function FilterSortRow({ children, className }: Props) {
  return <div className={`${styles.row} ${className ?? ""}`}>{children}</div>;
}

export function FilterSortActions({ children, className }: Props) {
  return (
    <div className={`${styles.actions} ${className ?? ""}`}>{children}</div>
  );
}
