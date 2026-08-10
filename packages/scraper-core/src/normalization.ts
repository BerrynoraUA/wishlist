/** Port of `services/scraper/app/extractors/normalization.py`. */

const CURRENCY_ALIASES: Record<string, string> = {
  $: "USD",
  US$: "USD",
  USD: "USD",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
  "₴": "UAH",
  ГРН: "UAH",
  UAH: "UAH",
  "₺": "TRY",
  TL: "TRY",
  TRY: "TRY",
  "₽": "RUB",
  RUB: "RUB",
  ZŁ: "PLN",
  PLN: "PLN",
  KR: "DKK",
  DKK: "DKK",
  CAD: "CAD",
  AU$: "AUD",
  AUD: "AUD",
  INR: "INR",
  "₹": "INR",
  LEI: "RON",
  RON: "RON",
  KSH: "KES",
  KES: "KES",
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  trade: "™",
  reg: "®",
  copy: "©",
  deg: "°",
  middot: "·",
  bull: "•",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
  ntilde: "ñ",
  oslash: "ø",
  aring: "å",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  times: "×",
  divide: "÷",
  frac12: "½",
  frac14: "¼",
  minus: "−",
  prime: "′",
  Prime: "″",
  shy: "­",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwnj: "‌",
  zwj: "‍",
};

/**
 * Stand-in for Python's `html.unescape`. Covers numeric references plus the
 * named entities that show up in storefront markup; unknown names are left
 * untouched, exactly like an unresolvable reference in the Python version.
 */
function unescapeHtml(value: string): string {
  if (!value.includes("&")) return value;
  return value.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]{1,31});?/g,
    (match, ref: string) => {
      if (ref.startsWith("#")) {
        const isHex = ref[1] === "x" || ref[1] === "X";
        const code = Number.parseInt(isHex ? ref.slice(2) : ref.slice(1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[ref] ?? match;
    },
  );
}

export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return null;
  const text = unescapeHtml(String(value)).replace(/\s+/g, " ").trim();
  return text || null;
}

export function normalizeCurrency(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const upper = text.toUpperCase().replaceAll(".", "");
  const alias = CURRENCY_ALIASES[upper];
  if (alias) return alias;
  return /^[A-Z]{3}$/.test(upper) ? upper : null;
}

/**
 * Decimal-safe price normalization. Stays in string space (no float round
 * trip) so `1234567.89` survives, matching Python's `Decimal` behaviour.
 */
export function normalizePrice(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;

  let compact = text.replace(/[^\d,.-]/g, "");
  if (!compact || !/\d/.test(compact)) return null;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    compact = compact.split(thousandsSeparator).join("").split(decimalSeparator).join(".");
  } else if (lastComma >= 0) {
    const fractionalDigits = compact.length - lastComma - 1;
    compact = compact.split(",").join(fractionalDigits === 1 || fractionalDigits === 2 ? "." : "");
  } else if (lastDot >= 0) {
    const fractionalDigits = compact.length - lastDot - 1;
    if (fractionalDigits !== 1 && fractionalDigits !== 2) {
      compact = compact.split(".").join("");
    }
  }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(compact);
  if (!match) return null;

  const negative = match[1] === "-";
  const integerPart = match[2].replace(/^0+(?=\d)/, "");
  const fractionPart = (match[3] ?? "").replace(/0+$/, "");
  if (negative) return null;
  if (integerPart === "0" && fractionPart === "") return null;

  return fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
}

/** Compares two already-normalized price strings without float error. */
export function comparePrices(left: string, right: string): number {
  const [leftInt, leftFraction = ""] = left.split(".");
  const [rightInt, rightFraction = ""] = right.split(".");
  if (leftInt.length !== rightInt.length) return leftInt.length - rightInt.length;
  if (leftInt !== rightInt) return leftInt < rightInt ? -1 : 1;
  const width = Math.max(leftFraction.length, rightFraction.length);
  const leftPadded = leftFraction.padEnd(width, "0");
  const rightPadded = rightFraction.padEnd(width, "0");
  if (leftPadded === rightPadded) return 0;
  return leftPadded < rightPadded ? -1 : 1;
}

export function normalizeImageUrl(value: unknown, pageUrl: string): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (lowered.startsWith("data:") || lowered.startsWith("javascript:")) return null;

  // Some storefronts accidentally prepend a second scheme, for example
  // `https:https://cdn.example/image.jpg`. Keep the real absolute URL instead
  // of rejecting the otherwise valid product image.
  const repaired = text.replace(/^(https?):(?:https?:)+\/\//i, "$1://");

  let absolute: URL;
  try {
    absolute = pageUrl ? new URL(repaired, pageUrl) : new URL(repaired);
  } catch {
    try {
      absolute = new URL(repaired);
    } catch {
      return null;
    }
  }
  if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return null;
  if (!absolute.host) return null;
  return absolute.href;
}

export function normalizeDiscount(
  price: unknown,
  discountPrice: unknown,
): { price: string | null; discountPrice: string | null; hasDiscount: boolean } {
  let normalizedPrice = normalizePrice(price);
  let normalizedDiscount = normalizePrice(discountPrice);
  if (!normalizedPrice || !normalizedDiscount) {
    return {
      price: normalizedPrice ?? normalizedDiscount,
      discountPrice: null,
      hasDiscount: false,
    };
  }

  const comparison = comparePrices(normalizedPrice, normalizedDiscount);
  if (comparison === 0) {
    return { price: normalizedPrice, discountPrice: null, hasDiscount: false };
  }
  if (comparison < 0) {
    [normalizedPrice, normalizedDiscount] = [normalizedDiscount, normalizedPrice];
  }
  return { price: normalizedPrice, discountPrice: normalizedDiscount, hasDiscount: true };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hostnameOf(pageUrl: string): string {
  try {
    return new URL(pageUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function pathnameOf(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname;
  } catch {
    return "";
  }
}
