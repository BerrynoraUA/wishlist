export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasInvalidOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed !== "" && !isValidHttpUrl(trimmed);
}
