import { HTMLAttributes, ReactNode } from "react";
import styles from "./Typography.module.scss";
import type { TypographyTone } from "./Heading";

const toneClass: Record<TypographyTone, string> = {
  primary: styles.tonePrimary,
  secondary: styles.toneSecondary,
  muted: styles.toneMuted,
  brand: styles.toneBrand,
};

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: TypographyTone;
};

export function Eyebrow({
  children,
  tone = "muted",
  className,
  ...props
}: EyebrowProps) {
  const cls = `${styles.eyebrow} ${toneClass[tone]} ${className ?? ""}`.trim();
  return (
    <span className={cls} {...props}>
      {children}
    </span>
  );
}
