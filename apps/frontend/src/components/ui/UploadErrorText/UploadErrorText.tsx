import styles from "./UploadErrorText.module.scss";

type Props = {
  message?: string | null;
  className?: string;
};

export function UploadErrorText({ message, className }: Props) {
  if (!message) {
    return null;
  }

  return <p className={`${styles.error} ${className ?? ""}`.trim()}>{message}</p>;
}
