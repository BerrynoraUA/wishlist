"use client";

import { useEffect, useRef, useState } from "react";
import { useGT, useLocale } from "gt-next";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "./Calendar";
import styles from "./DatePickerField.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  calendarClassName?: string;
  allowClear?: boolean;
  disabled?: boolean;
  showCloseButton?: boolean;
};

export function DatePickerField({
  value,
  onChange,
  className,
  triggerClassName,
  calendarClassName,
  allowClear = true,
  disabled = false,
  showCloseButton = true,
}: Props) {
  const t = useGT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: MouseEvent | PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapperRef.current?.contains(target)) return;
      setExpanded(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString(locale ?? "en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ""}`.trim()}>
      <div
        className={`${styles.trigger} ${expanded ? styles.triggerActive : ""} ${triggerClassName ?? ""}`.trim()}
        onClick={() => {
          if (disabled) return;
          setExpanded((v) => !v);
        }}
      >
        <CalendarDays size={16} className={styles.icon} />
        <span className={value ? styles.value : styles.placeholder}>
          {value ? displayValue : t("Select a date", { $id: "datePicker.placeholder" })}
        </span>
        {expanded && showCloseButton ? (
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            type="button"
            aria-label={t("Close calendar", { $id: "datePicker.closeAria" })}
            disabled={disabled}
          >
            <X size={14} />
          </button>
        ) : value && allowClear ? (
          <button
            className={`${styles.clearBtn} iconTooltipTrigger`}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              onChange("");
            }}
            type="button"
            aria-label={t("Clear date", { $id: "datePicker.clearAria" })}
            data-tooltip={t("Clear date", { $id: "datePicker.clearTooltip" })}
            disabled={disabled}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {expanded && (
        <div className={`${styles.calendarWrap} ${calendarClassName ?? ""}`.trim()}>
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
