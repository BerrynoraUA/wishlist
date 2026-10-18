"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import styles from "./marketing.module.scss";
import { pillSpring } from "./motion";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Segmented control with the sliding pill of the native SlidingOptionSelector. */
export function ViewToggle<T extends string>({ label, options, value, onChange }: Props<T>) {
  const pillId = useId();

  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={styles.toggleOption}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className={styles.togglePill}
                transition={pillSpring}
              />
            )}
            <span className={styles.toggleLabel}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
