import type { TranslateFn } from "@/lib/translate-fn";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";

export const SECRET_SANTA_PAGE_SIZE = 20;
export const MIN_PARTICIPANTS_TO_LAUNCH = 2;
export const SECRET_SANTA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function formatSecretSantaDate(dateStr: string, locale = "en") {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSecretSantaBudget(budget: number, currency: string | null | undefined) {
  return `${normalizeCurrencyCode(currency)} ${budget}`;
}

export function buildSecretSantaJoinUrl(eventId: string) {
  const baseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(/\/$/, "");
  return `${baseUrl}/secret-santa/join?event=${eventId}`;
}

export function getSecretSantaPersonName(
  person: { display_name: string | null; nickname: string | null },
  t: TranslateFn,
) {
  return person.display_name || person.nickname || t("User");
}
