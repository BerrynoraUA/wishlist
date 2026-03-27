"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"month" | "year">("month");

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
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!pickerOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setPickerOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [pickerOpen]);

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
  const currentMonthLabel = MONTHS[viewMonth];

  const yearOptions = useMemo(() => {
    const start = Math.min(today.getFullYear(), viewYear) - 12;
    const end = Math.max(today.getFullYear(), viewYear) + 12;

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [today, viewYear]);

  const handleMonthSelect = (month: number) => {
    if (month === viewMonth) return;
    onMonthChange?.();
    setViewMonth(month);
    setPickerOpen(false);
  };

  const handleYearSelect = (year: number) => {
    if (year === viewYear) return;
    onMonthChange?.();
    setViewYear(year);
    setPickerOpen(false);
  };

  const openPicker = (mode: "month" | "year") => {
    setPickerMode(mode);
    setPickerOpen((current) => (current && pickerMode === mode ? false : true));
  };

  return (
    <div className={`${styles.calendar} ${className ?? ""}`}>
      <div className={styles.header}>
        <button
          className={`${styles.navBtn} iconTooltipTrigger`}
          onClick={prevMonth}
          aria-label="Previous month"
          data-tooltip="Previous month"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <div className={styles.monthPickerWrap} ref={pickerRef}>
          <div className={styles.monthLabelGroup} aria-label={monthLabel}>
            <button
              className={`${styles.monthLabel} ${pickerOpen && pickerMode === "month" ? styles.monthLabelActive : ""}`}
              onClick={() => openPicker("month")}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen && pickerMode === "month"}
            >
              <span>{currentMonthLabel}</span>
              <ChevronDown
                size={14}
                className={`${styles.monthLabelChevron} ${pickerOpen && pickerMode === "month" ? styles.monthLabelChevronOpen : ""}`}
              />
            </button>

            <button
              className={`${styles.monthLabel} ${styles.yearLabel} ${pickerOpen && pickerMode === "year" ? styles.monthLabelActive : ""}`}
              onClick={() => openPicker("year")}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen && pickerMode === "year"}
            >
              <span>{viewYear}</span>
              <ChevronDown
                size={14}
                className={`${styles.monthLabelChevron} ${pickerOpen && pickerMode === "year" ? styles.monthLabelChevronOpen : ""}`}
              />
            </button>
          </div>

          {pickerOpen && (
            <div
              className={`${styles.monthPickerPanel} ${pickerMode === "year" ? styles.monthPickerPanelYear : styles.monthPickerPanelMonth}`}
              role="dialog"
              aria-label={
                pickerMode === "month" ? "Choose month" : "Choose year"
              }
            >
              <div className={styles.monthPickerField}>
                <span>
                  {pickerMode === "month" ? "Choose month" : "Choose year"}
                </span>

                {pickerMode === "month" ? (
                  <div
                    className={styles.monthOptions}
                    role="listbox"
                    aria-label="Choose month"
                  >
                    {MONTHS.map((month, index) => {
                      const isSelected = index === viewMonth;

                      return (
                        <button
                          key={month}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`${styles.monthOption} ${isSelected ? styles.monthOptionSelected : ""}`}
                          onClick={() => handleMonthSelect(index)}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={styles.yearList}
                    role="listbox"
                    aria-label="Choose year"
                  >
                    {yearOptions.map((year) => {
                      const isSelected = year === viewYear;

                      return (
                        <button
                          key={year}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`${styles.yearOption} ${isSelected ? styles.yearOptionSelected : ""}`}
                          onClick={() => handleYearSelect(year)}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={styles.monthPickerActions}>
                <button
                  type="button"
                  className={styles.monthPickerAction}
                  onClick={goToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`${styles.monthPickerAction} ${styles.monthPickerActionPrimary}`}
                  onClick={() => setPickerOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          className={`${styles.navBtn} iconTooltipTrigger`}
          onClick={nextMonth}
          aria-label="Next month"
          data-tooltip="Next month"
          type="button"
        >
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
          const isSelected =
            selectedDate != null && cell.dateKey === selectedDate;
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
