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

export function isValidHttpUrl(value: string) {
  return getValidHttpUrl(value) !== null;
}

export function hasInvalidOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed !== "" && !isValidHttpUrl(trimmed);
}
