export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.href.startsWith("http://") || url.href.startsWith("https://");
  } catch {
    return false;
  }
}

export function hasInvalidOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed !== "" && !isValidHttpUrl(trimmed);
}
