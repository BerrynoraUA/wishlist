import styles from "./ProBadge.module.scss";

type Props = {
  size?: "sm" | "md";
  label?: string;
};

export function ProBadge({ size = "sm", label = "PRO" }: Props) {
  return <span className={`${styles.badge} ${styles[size]}`}>{label}</span>;
}
