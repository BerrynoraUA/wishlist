export function getValidHttpUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Item links are typed by hand and often arrive without a scheme
 * ("shop.com/x"). The strict validator rejects those, which silently hides the
 * link instead of showing it, so assume https before giving up.
 */
export function getLinkUrl(value: string | null | undefined) {
  const direct = getValidHttpUrl(value);
  if (direct) return direct;

  const trimmed = value?.trim() ?? "";
  if (!trimmed || /s/.test(trimmed) || !trimmed.includes(".")) return null;

  return getValidHttpUrl(`https://${trimmed}`);
}

export function isValidHttpUrl(value: string) {
  return getValidHttpUrl(value) !== null;
}

export function hasInvalidOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed !== "" && !isValidHttpUrl(trimmed);
}
