import { createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";
import { getMcpConfig } from "./config";
import { download } from "./images";

// The card may only load images from Wishlane and its storage (the CSP names exactly those), so
// shop images are fetched and re-served from Wishlane. Only URLs this server signed are served,
// which keeps the route from becoming an open image proxy.

export const IMAGE_PATH = "/api/mcp/image";

function signature(url: string, secret: string) {
  return createHmac("sha256", secret).update(`image:${url}`).digest("base64url");
}

/** Where the card should load an image from, or undefined when it can load the URL directly. */
function imageSource(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const { origin, confirmationSecret } = getMcpConfig();
  const storageOrigin = new URL(getSupabasePublicEnv().url).origin;
  if (parsed.protocol !== "https:" || [origin, storageOrigin].includes(parsed.origin))
    return undefined;
  const query = new URLSearchParams({
    url: parsed.href,
    sig: signature(parsed.href, confirmationSecret),
  });
  return `${origin}${IMAGE_PATH}?${query}`;
}

/** Maps every external image_url in a tool result to its Wishlane address. */
export function imageSources(data: unknown) {
  const sources: Record<string, string> = {};
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if (key === "image_url" && typeof entry === "string") {
        const source = imageSource(entry);
        if (source) sources[entry] = source;
      } else visit(entry);
    }
  };
  visit(data);
  return Object.keys(sources).length ? sources : undefined;
}

/** Downloads a signed shop image and re-encodes it, so only plain pixels reach the card. */
export async function proxiedImage(url: string, sig: string) {
  const expected = Buffer.from(signature(url, getMcpConfig().confirmationSecret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return sharp(await download(url), { limitInputPixels: 25_000_000 })
    .rotate()
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
