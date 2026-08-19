import { defineConfig } from "vitest/config";

/**
 * Root-level tests cover the repo scripts (the app-store showcase harness); each
 * workspace package keeps its own config and runs under `turbo run test`.
 */
export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
  },
});
