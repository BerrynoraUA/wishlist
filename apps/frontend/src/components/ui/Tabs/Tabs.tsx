"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  // Scrollable rows hide their scrollbar, so fade whichever edge has more tabs behind it.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setOverflow({
        start: element.scrollLeft > 1,
        end: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;
    element
      .querySelector<HTMLElement>(`.${styles.active}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <Tag
      ref={ref}
      data-fade-start={overflow.start || undefined}
      data-fade-end={overflow.end || undefined}
      className={`${styles.tabs} ${styles[size]} ${className ?? ""}`}
      {...(Tag === "nav" && ariaLabel ? { "aria-label": ariaLabel } : {})}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`${styles.tab} ${tabClassName ?? ""} ${active === item.value ? `${styles.active} ${activeTabClassName ?? ""}` : ""}`}
          onClick={() => onChange(item.value)}
          aria-pressed={active === item.value}
          data-guide-target={item.guideTarget}
        >
          {item.label}
          {item.badge !== undefined && (
            <span
              className={styles.badge}
              // A count of zero is not something to be drawn to: the pill keeps its shape
              // so the row does not shift, but loses the brand fill that reads as "look here".
              data-empty={item.badge === 0 || undefined}
            >
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </Tag>
  );
}
