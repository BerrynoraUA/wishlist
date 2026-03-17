import styles from "./ProBadge.module.scss";

type Props = {
  size?: "sm" | "md";
};

export function ProBadge({ size = "sm" }: Props) {
  return <span className={`${styles.badge} ${styles[size]}`}>PRO</span>;
}
