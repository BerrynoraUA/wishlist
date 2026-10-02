/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  // app.config.ts is a TypeScript dynamic config, so @expo/config evaluates it
  // through the TypeScript compiler and every file in that module graph lands
  // in the native fingerprint — including node_modules/typescript/lib/typescript.js.
  // Left in, a routine `typescript` devDependency bump would change the native
  // fingerprint and force a fresh build in all five EAS lanes instead of an OTA,
  // even though TypeScript cannot affect the native project. Both paths are
  // listed because pnpm may hoist typescript to the workspace root or keep it
  // local to this package; ignorePaths does not match across `..` implicitly.
  ignorePaths: ["../../node_modules/typescript/**", "node_modules/typescript/**"],
};
