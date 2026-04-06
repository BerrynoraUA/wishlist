function parseFlexibleDate(value: string): Date {
  const trimmed = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]) - 1;
    const d = Number(ymd[3]);
    return new Date(y, m, d);
  }
  return new Date(trimmed);
}

/**
 * Short calendar date in the active app locale (month abbreviation + day + year).
 * Date-only `YYYY-MM-DD` is interpreted as that calendar day (no UTC shift).
 */
export function formatLocalizedShortDate(
  dateInput: string | Date,
  locale: string,
): string {
  const tag = locale || "en";
  try {
    const d =
      typeof dateInput === "string" ? parseFlexibleDate(dateInput) : dateInput;
    if (Number.isNaN(d.getTime())) {
      return typeof dateInput === "string" ? dateInput : "";
    }
    return d.toLocaleDateString(tag, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}
