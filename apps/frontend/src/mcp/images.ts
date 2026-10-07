import { randomUUID } from "node:crypto";
import { lookup, type LookupAddress } from "node:dns";
import { get } from "node:https";
import { BlockList, type LookupFunction } from "node:net";
import sharp from "sharp";
import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { id } from "./schemas";
import { checked, safeItem, ToolError } from "./results";
import { requireItem } from "./access";

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_FAILED =
  "Unable to upload this image. Choose a PNG, JPEG or WebP under 5 MB and check that you can edit this wish.";

// Attachment URLs come from the model's arguments, so never let one reach a private network.
const PRIVATE = new BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 3],
] as const)
  PRIVATE.addSubnet(prefix, bits, "ipv4");
for (const [prefix, bits] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  PRIVATE.addSubnet(prefix, bits, "ipv6");

// Checked at connect time, so a DNS answer cannot change between the check and the request.
export const publicLookup: LookupFunction = (hostname, options, callback) =>
  lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    const unsafe =
      !addresses?.length ||
      addresses.some(({ address, family }) =>
        PRIVATE.check(address, family === 6 ? "ipv6" : "ipv4"),
      );
    if (error || unsafe) return callback(error ?? new Error("Blocked address"), "", 0);
    if (options.all) return (callback as (e: null, a: LookupAddress[]) => void)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });

export function download(url: string, redirects = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (new URL(url).protocol !== "https:") return reject(new Error("HTTPS only"));
    // Some image hosts (e.g. Wikimedia) refuse requests that do not identify themselves.
    const headers = { "User-Agent": "Wishlane/1.0 (+https://wishlane.net)", Accept: "image/*" };
    const request = get(url, { lookup: publicLookup, timeout: 15_000, headers }, (response) => {
      const { statusCode = 0, headers } = response;
      if (statusCode >= 300 && statusCode < 400 && headers.location && redirects > 0) {
        response.resume();
        return download(new URL(headers.location, url).href, redirects - 1).then(resolve, reject);
      }
      if (statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${statusCode}`));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) return request.destroy(new Error("Image too large"));
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("Timed out")));
    request.on("error", reject);
  });
}

/** Re-encodes the image, stores it and points the wish at it. */
async function saveWishImage(ctx: McpContext, itemId: string, load: () => Promise<Buffer>) {
  const bucket = ctx.db.storage.from("items");
  let uploadedPath: string | undefined;
  try {
    const { wishlist } = await requireItem(ctx, itemId, "edit");
    const bytes = await load();
    if (bytes.length > MAX_BYTES) throw new Error("Image too large");
    // Decode and re-encode; SVG/script payloads and metadata are never published.
    const image = await sharp(bytes, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const path = `${ctx.userId}/mcp-${randomUUID()}.webp`;
    await checked(bucket.upload(path, image, { contentType: "image/webp" }));
    uploadedPath = path;
    const item = await checked(
      ctx.db
        .from("item")
        .update({ image_url: bucket.getPublicUrl(path).data.publicUrl })
        .eq("id", itemId)
        .select()
        .single(),
    );
    return { kind: "items", wishlist, items: [safeItem(item, ctx.userId, wishlist.user_id)] };
  } catch {
    if (uploadedPath) await bucket.remove([uploadedPath]);
    throw new ToolError(UPLOAD_FAILED);
  }
}

export function imageTools(tools: Tools, ctx: McpContext) {
  tools.add("upload_wish_image", {
    title: "Upload item image",
    description:
      "Upload an image explicitly selected by the user in the Wishlane card, replacing the selected wish's image.",
    schema: {
      item_id: id,
      base64: z
        .string()
        .max(7_000_000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    },
    appOnly: true,
    run: ({ item_id, base64 }) =>
      saveWishImage(ctx, item_id, async () => Buffer.from(base64, "base64")),
  });
  tools.add("attach_wish_image", {
    title: "Use an attached photo for an item",
    description:
      "Replace a wish's image with a photo the user attached to this chat. Only pass a file the user attached for this wish. Where attachments are unavailable, set image_url with update_wish or point the user to the card's upload button.",
    schema: {
      item_id: id,
      image: z
        .object({
          download_url: z.string().url().max(4096),
          file_id: z.string().max(200),
          mime_type: z.string().max(100).optional(),
          file_name: z.string().max(500).optional(),
        })
        .strict(),
    },
    fileParams: ["image"],
    view: true,
    run: ({ item_id, image }) => saveWishImage(ctx, item_id, () => download(image.download_url)),
  });
}
