/**
 * Calendar Export Utility
 *
 * Generates iCalendar (.ics) files for exporting events to Google Calendar,
 * Apple Calendar, Outlook, and other calendar applications.
 *
 * Format follows RFC 5545 iCalendar specification.
 */

export interface CalendarEvent {
  /** Unique identifier for the event */
  id: string;
  /** Event title */
  title: string;
  /** Event description (optional) */
  description?: string | null;
  /** Event date in YYYY-MM-DD format or ISO string */
  date: string;
  /** Event URL (optional) */
  url?: string | null;
}

/**
 * Escapes special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Converts a date string to iCalendar DATE format (YYYYMMDD)
 */
function toICalDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Generates a unique identifier for iCalendar events
 */
function generateUID(id: string): string {
  return `${id}@wishlane.app`;
}

/**
 * Generates current timestamp in iCalendar format
 */
function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates an iCalendar (.ics) file content for a single event
 */
export function generateICS(event: CalendarEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wishlane//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${generateUID(event.id)}`,
    `DTSTAMP:${getCurrentTimestamp()}`,
    `DTSTART;VALUE=DATE:${toICalDate(event.date)}`,
    `DTEND;VALUE=DATE:${toICalDate(event.date)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  // iCalendar spec requires CRLF line endings
  return lines.join("\r\n");
}

/**
 * Generates an iCalendar (.ics) file content for multiple events
 */
export function generateMultipleICS(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "";
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wishlane//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${generateUID(event.id)}`,
      `DTSTAMP:${getCurrentTimestamp()}`,
      `DTSTART;VALUE=DATE:${toICalDate(event.date)}`,
      `DTEND;VALUE=DATE:${toICalDate(event.date)}`,
      `SUMMARY:${escapeICalText(event.title)}`,
    );

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Downloads an .ics file with the given content
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single calendar event as a downloadable .ics file
 */
export function exportCalendarEvent(event: CalendarEvent): void {
  const icsContent = generateICS(event);
  const safeTitle = event.title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
  downloadICS(icsContent, `${safeTitle}.ics`);
}

/**
 * Exports multiple calendar events as a single downloadable .ics file
 */
export function exportMultipleCalendarEvents(
  events: CalendarEvent[],
  filename: string = "wishlane-events",
): void {
  const icsContent = generateMultipleICS(events);
  downloadICS(icsContent, `${filename}.ics`);
}
