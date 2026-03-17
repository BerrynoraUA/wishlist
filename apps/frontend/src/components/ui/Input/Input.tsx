import styles from "./Input.module.scss";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
};

export function Input({ type = "text", ...props }: Props) {
  return <input type={type} className={styles.input} {...props} />;
}
