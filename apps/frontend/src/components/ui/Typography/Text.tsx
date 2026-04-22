import { ElementType, HTMLAttributes, ReactNode, createElement } from "react";
import styles from "./Typography.module.scss";
import type { TypographyTone } from "./Heading";

const toneClass: Record<TypographyTone, string> = {
  primary: styles.tonePrimary,
  secondary: styles.toneSecondary,
  muted: styles.toneMuted,
  brand: styles.toneBrand,
};

const variantClass = {
  body: styles.body,
  subtitle: styles.subtitle,
  caption: styles.caption,
} as const;

type TextVariant = keyof typeof variantClass;

type TextProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TypographyTone;
  as?: ElementType;
};

export function Text({
  children,
  variant = "body",
  tone = "primary",
  as = "p",
  className,
  ...props
}: TextProps) {
  const cls =
    `${styles.text} ${variantClass[variant]} ${toneClass[tone]} ${className ?? ""}`.trim();
  return createElement(as, { className: cls, ...props }, children);
}
