import styles from "./SecretSantaJoinStatus.module.scss";

type Props = {
  message: string;
};

export function SecretSantaJoinStatus({ message }: Props) {
  return (
    <div className={styles.statusCard}>
      <p>{message}</p>
    </div>
  );
}
