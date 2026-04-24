import { LabelHTMLAttributes, ReactNode } from "react";
import styles from "./Typography.module.scss";
import type { TypographyTone } from "./Heading";

const toneClass: Record<TypographyTone, string> = {
  primary: styles.tonePrimary,
  secondary: styles.toneSecondary,
  muted: styles.toneMuted,
  brand: styles.toneBrand,
};

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  tone?: TypographyTone;
};

export function Label({ children, tone = "primary", className, ...props }: LabelProps) {
  const cls = `${styles.label} ${toneClass[tone]} ${className ?? ""}`.trim();
  return (
    <label className={cls} {...props}>
      {children}
    </label>
  );
}
