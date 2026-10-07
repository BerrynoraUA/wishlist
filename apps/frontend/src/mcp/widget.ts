import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// Shipped with the /api/mcp function via `outputFileTracingIncludes` in next.config.ts.
export const widgetHtml = readFileSync(path.join(process.cwd(), "src/mcp/widget.html"), "utf8");

// ChatGPT caches the card by URI, so every change to the card gets a new one.
const version = createHash("sha256").update(widgetHtml).digest("hex").slice(0, 12);
export const WIDGET_URI = `ui://wishlane/cards-${version}.html`;
