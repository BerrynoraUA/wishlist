import styles from "./Button.module.scss";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "md" | "sm";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}
