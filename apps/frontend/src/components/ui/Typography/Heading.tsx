import { HTMLAttributes, ReactNode, createElement } from "react";
import styles from "./Typography.module.scss";

export type TypographyTone = "primary" | "secondary" | "muted" | "brand";

const toneClass: Record<TypographyTone, string> = {
  primary: styles.tonePrimary,
  secondary: styles.toneSecondary,
  muted: styles.toneMuted,
  brand: styles.toneBrand,
};

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
  /** Semantic level. Visual size is the same regardless of level. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  tone?: TypographyTone;
};

export function Heading({
  children,
  level = 2,
  tone = "primary",
  className,
  ...props
}: HeadingProps) {
  const cls =
    `${styles.heading} ${styles.title} ${toneClass[tone]} ${className ?? ""}`.trim();
  return createElement(`h${level}`, { className: cls, ...props }, children);
}
