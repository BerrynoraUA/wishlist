import styles from "./Toggle.module.scss";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelClassName?: string;
};

export function Toggle({ checked, onChange, disabled = false, label, labelClassName }: Props) {
  return (
    <label className={`${styles.toggle} ${disabled ? styles.disabled : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`${styles.track} ${checked ? styles.on : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className={styles.thumb} />
      </button>
      {label && <span className={`${styles.label} ${labelClassName ?? ""}`}>{label}</span>}
    </label>
  );
}
