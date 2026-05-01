const accents = ["pink", "blue", "mint", "peach", "lavender"] as const;

export type SecretSantaAccent = (typeof accents)[number];

/**
 * Map a stable event id to one of the accent palette entries.
 */
export function getAccentFromId(id: string): SecretSantaAccent {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }

  return accents[Math.abs(hash) % accents.length];
}

/**
 * Format a `YYYY-MM-DD` event date as a human-readable long date.
 */
export function formatEventDate(dateStr: string, locale = "en") {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build the absolute URL used to invite someone to a Secret Santa event.
 * Returns empty string on the server where `window` is unavailable.
 */
export function buildSecretSantaJoinUrl(eventId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/secret-santa/join?event=${eventId}`;
}
