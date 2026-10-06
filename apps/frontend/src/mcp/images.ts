import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./auth";
import { id } from "./schemas";
import { checked, result, safeItem } from "./results";
import { getItem } from "./items";
import { WIDGET_URI } from "./config";

export function registerImageUpload(server: McpServer, ctx: McpContext) {
  registerAppTool(
    server,
    "upload_wish_image",
    {
      title: "Upload wish image",
      description:
        "Upload an image explicitly selected by the user in the Wishlane card, replacing the selected wish's image.",
      inputSchema: {
        item_id: id,
        base64: z
          .string()
          .max(7_000_000)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: {
        securitySchemes: [{ type: "oauth2", scopes: ["openid"] }],
        ui: { resourceUri: WIDGET_URI, visibility: ["app"] },
        "openai/visibility": "private",
        "openai/widgetAccessible": true,
      },
    },
    async ({ item_id, base64 }: { item_id: string; base64: string }) => {
      let uploadedPath: string | undefined;
      try {
        const { wishlist } = await getItem(ctx, item_id, true);
        const bytes = Buffer.from(base64, "base64");
        if (bytes.length > 5 * 1024 * 1024) throw new Error("Image too large");
        // Decode and re-encode; SVG/script payloads and metadata are never published.
        const image = await sharp(bytes, { limitInputPixels: 25_000_000 })
          .rotate()
          .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        const path = `${ctx.userId}/mcp-${randomUUID()}.webp`;
        await checked(
          ctx.db.storage.from("items").upload(path, image, { contentType: "image/webp" }),
        );
        uploadedPath = path;
        const { data } = ctx.db.storage.from("items").getPublicUrl(path);
        const item = await checked(
          ctx.db
            .from("item")
            .update({ image_url: data.publicUrl })
            .eq("id", item_id)
            .select()
            .single(),
        );
        return result({
          kind: "items",
          wishlist,
          items: [safeItem(item, ctx.userId, wishlist.user_id)],
        });
      } catch {
        if (uploadedPath) await ctx.db.storage.from("items").remove([uploadedPath]);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Unable to upload this image. Choose a PNG, JPEG or WebP under 5 MB and check that you can edit this wish.",
            },
          ],
        };
      }
    },
  );
}
