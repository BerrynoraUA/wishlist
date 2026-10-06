import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { id } from "./schemas";
import { checked, safeItem, ToolError } from "./results";
import { requireItem } from "./access";

const UPLOAD_FAILED =
  "Unable to upload this image. Choose a PNG, JPEG or WebP under 5 MB and check that you can edit this wish.";

export function imageTools(tools: Tools, ctx: McpContext) {
  tools.add("upload_wish_image", {
    title: "Upload wish image",
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
    run: async ({ item_id, base64 }) => {
      const bucket = ctx.db.storage.from("items");
      let uploadedPath: string | undefined;
      try {
        const { wishlist } = await requireItem(ctx, item_id, "edit");
        const bytes = Buffer.from(base64, "base64");
        if (bytes.length > 5 * 1024 * 1024) throw new Error("Image too large");
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
            .eq("id", item_id)
            .select()
            .single(),
        );
        return { kind: "items", wishlist, items: [safeItem(item, ctx.userId, wishlist.user_id)] };
      } catch {
        if (uploadedPath) await bucket.remove([uploadedPath]);
        throw new ToolError(UPLOAD_FAILED);
      }
    },
  });
}
