import styles from "./DraftBadge.module.scss";

type Props = {
  label?: string;
  variant?: "pill" | "dot";
  className?: string;
};

export function DraftBadge({ label = "Draft", variant = "pill", className }: Props) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${className ?? ""}`.trim()}
      aria-hidden={variant === "dot"}
    >
      {variant === "pill" ? label : null}
    </span>
  );
}
