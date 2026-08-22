import { getValidHttpUrl } from "@/lib/urls";

/** Trailing characters that read as sentence punctuation rather than part of the link. */
const TRAILING_NOISE = /[.,;:!?"'”’)\]}>]+$/;

const URL_TOKEN = /https?:\/\/\S+/gi;

/**
 * The product URL inside a payload shared from another app.
 *
 * Browsers and most retailer apps hand over `webUrl`. Instagram, TikTok and the
 * messengers share plain text with the link embedded in a sentence, so fall back to
 * scanning `text` for the first usable link.
 */
export function extractSharedProductUrl(
  intent: { webUrl?: string | null; text?: string | null } | null | undefined,
): string | null {
  const webUrl = getValidHttpUrl(intent?.webUrl);
  if (webUrl) return webUrl;

  for (const token of intent?.text?.match(URL_TOKEN) ?? []) {
    const url = getValidHttpUrl(token.replace(TRAILING_NOISE, ""));
    if (url) return url;
  }

  return null;
}
