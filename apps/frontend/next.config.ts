import type { NextConfig } from "next";
import { withGTConfig } from "gt-next/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@wishlist/backend"],
  // The MCP widget is read from disk at runtime (src/mcp/widget.ts).
  outputFileTracingIncludes: { "/api/mcp": ["./src/mcp/widget.html"] },
};

export default withGTConfig(nextConfig);
