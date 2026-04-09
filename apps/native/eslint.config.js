// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Path alias `@/*` + `moduleSuffixes` (`.ios` / `.android`) — valid for Metro/TS, not for eslint-plugin-import.
      "import/no-unresolved": ["error", { ignore: ["^@/"] }],
    },
  },
]);
