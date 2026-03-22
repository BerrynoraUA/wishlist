"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "./Calendar";
import styles from "./DatePickerField.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DatePickerField({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.trigger} ${expanded ? styles.triggerActive : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <CalendarDays size={16} className={styles.icon} />
        <span className={value ? styles.value : styles.placeholder}>
          {value ? displayValue : "Select a date"}
        </span>
        {value && (
          <button
            className={styles.clearBtn}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            type="button"
            aria-label="Clear date"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div className={styles.calendarWrap}>
          <Calendar
            selectedDate={value || null}
            onDateSelect={(date) => {
              onChange(date);
              setExpanded(false);
            }}
            initialDate={value || null}
          />
        </div>
      )}
    </div>
  );
}
