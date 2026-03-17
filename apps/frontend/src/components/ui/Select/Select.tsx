import styles from "./Select.module.scss";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
};

export function Select({ value, onChange, options }: Props) {
  return (
    <select value={value} onChange={onChange} className={styles.select}>
      {options.map((opt) => (
        <option key={opt}>{opt}</option>
      ))}
    </select>
  );
}
