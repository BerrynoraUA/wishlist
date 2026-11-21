import Link from "next/link";
import styles from "./SecretSantaJoinStatus.module.scss";

type Props = {
  message: string;
  /** A way forward when joining can't continue. */
  action?: { href: string; label: string };
};

export function SecretSantaJoinStatus({ message, action }: Props) {
  return (
    <div className={styles.statusCard}>
      <p>{message}</p>
      {action && (
        <Link href={action.href} className={styles.action}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
