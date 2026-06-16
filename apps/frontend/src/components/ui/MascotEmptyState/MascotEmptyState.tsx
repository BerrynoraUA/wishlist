import Image from "next/image";
import styles from "./MascotEmptyState.module.scss";

export type MascotVariant =
  | "sad-alone"
  | "gift-in-hands"
  | "empty-hands-shrug"
  | "magnifying-glass"
  | "explorer-map"
  | "sleeping-bell"
  | "lightbulb-idea"
  | "santa-sack"
  | "holding-key";

export function MascotEmptyState({
  message,
  variant,
  compact = false,
  className,
}: {
  message: string;
  variant: MascotVariant;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.state} ${compact ? styles.compact : ""} ${className ?? ""}`}>
      <Image
        className={styles.image}
        src={`/mascot/${variant}.png`}
        alt=""
        aria-hidden="true"
        width={256}
        height={256}
      />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
