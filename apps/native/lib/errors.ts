/**
 * The message of a caught error, or `fallback` for anything that is not an `Error`.
 *
 * Also keeps the conditional out of `catch` blocks: React Compiler cannot compile a
 * conditional inside a try/catch and skips the whole component instead.
 */
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
