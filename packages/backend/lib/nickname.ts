// Keep in sync with public.is_nickname_blocked() in supabase/migrations.

// Matched anywhere in the nickname, so they are only terms that never show up inside
// innocent words.
const BLOCKED_PATTERNS = [
  /n+i+g{2,}(e+r|a+|u+h|r)/,
  /k{3,}/,
  /wetback/,
  /beaner/,
  /raghead/,
  /towelhead/,
  /porchmonkey/,
  /junglebunny/,
  /zipperhead/,
  /spearchucker/,
  /tarbaby/,
  /chingchong/,
  /golliwog/,
  /darkie/,
  /whitepower/,
  /whitepride/,
  /heilhitler/,
  /siegheil/,
];

// Short terms that hide inside normal words ("raccoon", "spicy", "japan"), so they only
// count as a whole part of the nickname.
const BLOCKED_PARTS = new Set([
  "abo",
  "boong",
  "chink",
  "coon",
  "dago",
  "gook",
  "jap",
  "kafir",
  "kaffir",
  "kike",
  "nig",
  "paki",
  "redskin",
  "spic",
  "spick",
  "squaw",
  "wop",
]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[013457@$]/g, (char) => LEET[char] ?? char)
    .replace(/[^a-z]/g, "");
}

export function isNicknameBlocked(nickname: string) {
  const lower = nickname.toLowerCase();
  if (lower.includes("1488")) return true;

  const normalized = normalize(lower);
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  return (
    lower
      .split(/[^a-z0-9@$]+/)
      // Trailing digits are a suffix ("coon99"), not leetspeak.
      .map((part) => normalize(part.replace(/\d+$/, "")).replace(/s$/, ""))
      .some((part) => BLOCKED_PARTS.has(part))
  );
}
