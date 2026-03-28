import styles from "./StatCard.module.scss";
import { Gift } from "lucide-react";

type Props = {
  label: string;
  value: number;
  onClick?: () => void;
};

export function StatCard({ label, value, onClick }: Props) {
  const content = (
    <>
      <div className={styles.iconWrapper}>
        <Gift size={18} />
      </div>

      <div className={styles.text}>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.interactive}`}
        onClick={onClick}
        aria-label={`Open ${label.toLowerCase()} in discover`}
      >
        {content}
      </button>
    );
  }

  return <div className={styles.card}>{content}</div>;
}
