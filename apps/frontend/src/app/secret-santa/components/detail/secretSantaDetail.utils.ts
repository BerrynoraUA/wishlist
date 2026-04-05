const accents = ["pink", "blue", "mint", "peach", "lavender"] as const;

export type SecretSantaAccent = (typeof accents)[number];

export function getAccentFromId(id: string): SecretSantaAccent {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }

  return accents[Math.abs(hash) % accents.length];
}

export function formatEventDate(dateStr: string, locale = "en") {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
