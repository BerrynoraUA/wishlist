/** gt-next's own cookie — writing it directly lets account-switch apply a cached locale
 * synchronously (mirroring theme/accent) before the full-page reload picks it up server-side. */
export const LOCALE_COOKIE_NAME = "generaltranslation.locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function buildLocaleCookie(locale: string): string {
  return `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function applyLocaleSynchronously(locale: string | null | undefined) {
  if (!locale || typeof document === "undefined") return;
  document.cookie = buildLocaleCookie(locale);
}

export function readLocaleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return null;
}
