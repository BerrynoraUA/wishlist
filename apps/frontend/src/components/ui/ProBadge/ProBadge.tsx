import styles from "./ProBadge.module.scss";

type Props = {
  size?: "sm" | "md";
  label?: string;
  /** Soft suits tags beside nav and logo text; solid stays for PRO. */
  tone?: "solid" | "soft";
};

export function ProBadge({ size = "sm", label = "PRO", tone = "solid" }: Props) {
  return <span className={`${styles.badge} ${styles[size]} ${styles[tone]}`}>{label}</span>;
}
