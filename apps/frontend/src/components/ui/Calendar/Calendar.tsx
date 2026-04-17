"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useGT, useLocale } from "gt-next";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  onCellMouseLeave?: (e: React.MouseEvent) => void;
  onMonthChange?: () => void;
  cellClassName?: (cell: CalendarCell) => string;
  cellStyle?: (cell: CalendarCell) => React.CSSProperties | undefined;
  renderCellContent?: (cell: CalendarCell) => ReactNode;
  footer?: ReactNode;
  className?: string;
  initialDate?: string | null;
};

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
  const t = useGT();
  const locale = useLocale();
  const today = useMemo(() => new Date(), []);

  const weekdays = useMemo(
    () => [
      t("Mo", { $id: "calendar.weekday.mo" }),
      t("Tu", { $id: "calendar.weekday.tu" }),
      t("We", { $id: "calendar.weekday.we" }),
      t("Th", { $id: "calendar.weekday.th" }),
      t("Fr", { $id: "calendar.weekday.fr" }),
      t("Sa", { $id: "calendar.weekday.sa" }),
      t("Su", { $id: "calendar.weekday.su" }),
    ],
    [t],
  );

  const months = useMemo(
    () => [
      t("January", { $id: "calendar.month.january" }),
      t("February", { $id: "calendar.month.february" }),
      t("March", { $id: "calendar.month.march" }),
      t("April", { $id: "calendar.month.april" }),
      t("May", { $id: "calendar.month.may" }),
      t("June", { $id: "calendar.month.june" }),
      t("July", { $id: "calendar.month.july" }),
      t("August", { $id: "calendar.month.august" }),
      t("September", { $id: "calendar.month.september" }),
      t("October", { $id: "calendar.month.october" }),
      t("November", { $id: "calendar.month.november" }),
      t("December", { $id: "calendar.month.december" }),
    ],
    [t],
  );
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

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth).toLocaleDateString(locale ?? "en", {
        month: "long",
        year: "numeric",
      }),
    [viewYear, viewMonth, locale],
  );
  const currentMonthLabel = months[viewMonth];

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
          aria-label={t("Previous month", {
            $id: "calendar.aria.prevMonth",
          })}
          data-tooltip={t("Previous month", {
            $id: "calendar.tooltip.prevMonth",
          })}
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
                pickerMode === "month"
                  ? t("Choose month", { $id: "calendar.aria.chooseMonth" })
                  : t("Choose year", { $id: "calendar.aria.chooseYear" })
              }
            >
              <div className={styles.monthPickerField}>
                <div className={styles.monthPickerTopRow}>
                  <span>
                    {pickerMode === "month"
                      ? t("Choose month", { $id: "calendar.chooseMonth" })
                      : t("Choose year", { $id: "calendar.chooseYear" })}
                  </span>
                  <button
                    type="button"
                    className={styles.monthPickerClose}
                    onClick={() => setPickerOpen(false)}
                    aria-label={t("Close calendar selector", {
                      $id: "calendar.aria.closePicker",
                    })}
                  >
                    <X size={14} />
                  </button>
                </div>

                {pickerMode === "month" ? (
                  <div
                    className={styles.monthOptions}
                    role="listbox"
                    aria-label={t("Choose month", {
                      $id: "calendar.listbox.month",
                    })}
                  >
                    {months.map((month, index) => {
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
                    aria-label={t("Choose year", {
                      $id: "calendar.listbox.year",
                    })}
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
                  {t("Today", { $id: "calendar.action.today" })}
                </button>
                <button
                  type="button"
                  className={`${styles.monthPickerAction} ${styles.monthPickerActionPrimary}`}
                  onClick={() => setPickerOpen(false)}
                >
                  {t("Done", { $id: "calendar.action.done" })}
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          className={`${styles.navBtn} iconTooltipTrigger`}
          onClick={nextMonth}
          aria-label={t("Next month", {
            $id: "calendar.aria.nextMonth",
          })}
          data-tooltip={t("Next month", {
            $id: "calendar.tooltip.nextMonth",
          })}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {weekdays.map((wd, i) => (
          <span key={`calendar-wd-${i}`}>{wd}</span>
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
