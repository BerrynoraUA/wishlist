"use client";

import { useState } from "react";
import { useGT, useLocale } from "gt-next";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "./Calendar";
import styles from "./DatePickerField.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
};

export function DatePickerField({ value, onChange, className, triggerClassName }: Props) {
  const t = useGT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString(locale ?? "en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`.trim()}>
      <div
        className={`${styles.trigger} ${expanded ? styles.triggerActive : ""} ${triggerClassName ?? ""}`.trim()}
        onClick={() => setExpanded((v) => !v)}
      >
        <CalendarDays size={16} className={styles.icon} />
        <span className={value ? styles.value : styles.placeholder}>
          {value ? displayValue : t("Select a date", { $id: "datePicker.placeholder" })}
        </span>
        {expanded ? (
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            type="button"
            aria-label={t("Close calendar", { $id: "datePicker.closeAria" })}
          >
            <X size={14} />
          </button>
        ) : value ? (
          <button
            className={`${styles.clearBtn} iconTooltipTrigger`}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            type="button"
            aria-label={t("Clear date", { $id: "datePicker.clearAria" })}
            data-tooltip={t("Clear date", { $id: "datePicker.clearTooltip" })}
          >
            <X size={14} />
          </button>
        ) : null}
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
