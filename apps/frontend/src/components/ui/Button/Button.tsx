import styles from "./Button.module.scss";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "md" | "sm";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
