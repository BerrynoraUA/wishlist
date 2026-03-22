"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Calendar.module.scss";

export type CalendarCell = {
  day: number | null;
  key: string;
  dateKey: string | null;
  isToday: boolean;
};

type Props = {
  selectedDate?: string | null;
  onDateSelect?: (dateKey: string) => void;
  onCellClick?: (dateKey: string, e: React.MouseEvent) => void;
  onCellMouseEnter?: (dateKey: string, e: React.MouseEvent) => void;
  onCellMouseLeave?: () => void;
  onMonthChange?: () => void;
  cellClassName?: (cell: CalendarCell) => string;
  cellStyle?: (cell: CalendarCell) => React.CSSProperties | undefined;
  renderCellContent?: (cell: CalendarCell) => ReactNode;
  footer?: ReactNode;
  className?: string;
  initialDate?: string | null;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function Calendar({
  selectedDate,
  onDateSelect,
  onCellClick,
  onCellMouseEnter,
  onCellMouseLeave,
  onMonthChange,
  cellClassName,
  cellStyle,
  renderCellContent,
  footer,
  className,
  initialDate,
}: Props) {
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(() => {
    if (initialDate) {
      const [y] = initialDate.split("-").map(Number);
      if (y) return y;
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (initialDate) {
      const [, m] = initialDate.split("-").map(Number);
      if (m) return m - 1;
    }
    return today.getMonth();
  });

  const prevMonth = () => {
    onMonthChange?.();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    onMonthChange?.();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    onMonthChange?.();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: CalendarCell[] = [];

    for (let i = 0; i < startWeekday; i++) {
      result.push({ day: null, key: `b${i}`, dateKey: null, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday =
        d === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear();
      result.push({ day: d, key: dateKey, dateKey, isToday });
    }

    return result;
  }, [viewYear, viewMonth, today]);

  const handleCellClick = useCallback(
    (dateKey: string, e: React.MouseEvent) => {
      if (onCellClick) {
        onCellClick(dateKey, e);
      } else if (onDateSelect) {
        onDateSelect(dateKey);
      }
    },
    [onCellClick, onDateSelect],
  );

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`${styles.calendar} ${className ?? ""}`}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month" type="button">
          <ChevronLeft size={16} />
        </button>
        <button className={styles.monthLabel} onClick={goToday} type="button">
          {monthLabel}
        </button>
        <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month" type="button">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((wd) => (
          <span key={wd}>{wd}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((cell) => {
          const isSelected = selectedDate != null && cell.dateKey === selectedDate;
          const customStyle = cellStyle ? cellStyle(cell) : undefined;
          const showToday = cell.isToday && !customStyle;
          const extraClass = cellClassName ? cellClassName(cell) : "";

          return (
            <div
              key={cell.key}
              className={`${styles.cell} ${showToday ? styles.today : ""} ${isSelected ? styles.selected : ""} ${cell.day === null ? styles.blank : ""} ${extraClass}`}
              style={customStyle}
              onClick={
                cell.dateKey
                  ? (e) => handleCellClick(cell.dateKey!, e)
                  : undefined
              }
              onMouseEnter={
                cell.dateKey && onCellMouseEnter
                  ? (e) => onCellMouseEnter(cell.dateKey!, e)
                  : undefined
              }
              onMouseLeave={
                cell.dateKey && onCellMouseLeave ? onCellMouseLeave : undefined
              }
            >
              {cell.day !== null &&
                (renderCellContent ? (
                  renderCellContent(cell)
                ) : (
                  <span className={styles.dayNumber}>{cell.day}</span>
                ))}
            </div>
          );
        })}
      </div>

      {footer}
    </div>
  );
}
