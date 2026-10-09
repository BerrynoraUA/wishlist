import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@/lib/priorities",
        replacement: fileURLToPath(
          new URL("../../packages/backend/lib/priorities.ts", import.meta.url),
        ),
      },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  test: {
    include: ["src/mcp/**/*.test.ts"],
    env: {
      WISHLANE_MCP_ORIGIN: "https://wishlane.example",
      WISHLANE_MCP_CHATGPT_CLIENT_ID: "10000000-0000-4000-8000-000000000001",
      WISHLANE_MCP_CLAUDE_CLIENT_ID: "10000000-0000-4000-8000-000000000003",
      WISHLANE_MCP_CONFIRMATION_SECRET: "test-only-confirmation-secret-at-least-32-characters",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
    },
  },
});
