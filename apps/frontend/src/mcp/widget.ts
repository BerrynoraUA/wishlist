import { readFileSync } from "node:fs";
import path from "node:path";

// Shipped with the /api/mcp function via `outputFileTracingIncludes` in next.config.ts.
export const widgetHtml = readFileSync(path.join(process.cwd(), "src/mcp/widget.html"), "utf8");
