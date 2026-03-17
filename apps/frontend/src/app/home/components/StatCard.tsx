import styles from "./StatCard.module.scss";
import { Gift } from "lucide-react";

type Props = {
  label: string;
  value: number;
};

export function StatCard({ label, value }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        <Gift size={18} />
      </div>

      <div className={styles.text}>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
