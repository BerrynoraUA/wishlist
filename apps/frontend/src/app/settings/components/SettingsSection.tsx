import styles from "./SettingsSection.module.scss";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
};

export function SettingsSection({
  title,
  description,
  children,
  danger = false,
}: Props) {
  return (
    <div className={`${styles.section} ${danger ? styles.danger : ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
