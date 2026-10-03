import type { TranslateFn } from "@/lib/translate-fn";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";
import { getDateTimeFormat } from "@/lib/intl";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";

export const SECRET_SANTA_PAGE_SIZE = 20;
export const MIN_PARTICIPANTS_TO_LAUNCH = 2;

// Same order and hash as the web `getAccentFromId`, so an event keeps its cover colour
// across platforms.
const SECRET_SANTA_ACCENTS = [
  WishlistAccent.Pink,
  WishlistAccent.Blue,
  WishlistAccent.Mint,
  WishlistAccent.Peach,
  WishlistAccent.Lavender,
] as const;

export function getSecretSantaAccent(eventId: string): WishlistAccent {
  let hash = 0;
  for (let index = 0; index < eventId.length; index += 1) {
    hash = (hash << 5) - hash + eventId.charCodeAt(index);
    hash |= 0;
  }
  return SECRET_SANTA_ACCENTS[Math.abs(hash) % SECRET_SANTA_ACCENTS.length]!;
}

export function formatSecretSantaDate(dateStr: string, locale = "en") {
  return getDateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(`${dateStr}T00:00:00`),
  );
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
