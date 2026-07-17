import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export type CalendarExportEvent = {
  id: string;
  title: string;
  date: string;
  description?: string | null;
  url?: string | null;
};

export async function shareCalendarEvents(events: CalendarExportEvent[], dialogTitle: string) {
  if (events.length === 0) return;
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const file = new File(Paths.cache, "friends-events.ics");
  file.create({ overwrite: true });
  file.write(generateCalendar(events));

  await Sharing.shareAsync(file.uri, {
    dialogTitle,
    mimeType: "text/calendar",
    UTI: "public.calendar-event",
  });
}

function generateCalendar(events: CalendarExportEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wishlane//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeCalendarText(event.id)}@wishlane.app`,
      `DTSTAMP:${formatTimestamp(new Date())}`,
      `DTSTART;VALUE=DATE:${formatCalendarDate(event.date)}`,
      `DTEND;VALUE=DATE:${formatCalendarDate(event.date)}`,
      `SUMMARY:${escapeCalendarText(event.title)}`,
    );

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeCalendarText(event.description)}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatCalendarDate(value: string) {
  const dateKey = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateKey) return `${dateKey[1]}${dateKey[2]}${dateKey[3]}`;

  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function formatTimestamp(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "T",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
    "Z",
  ].join("");
}
