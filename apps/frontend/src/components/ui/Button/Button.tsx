import styles from "./Button.module.scss";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
  size?: "md" | "sm";
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
