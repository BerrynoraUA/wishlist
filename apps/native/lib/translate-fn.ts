/**
 * Translation callback from General Translation (`useGT()` in components).
 */
export type TranslateFn = (
  msg: string,
  options?: Record<string, unknown> & {
    $id?: string;
    $context?: string;
    $maxChars?: number;
    $_hash?: string;
  },
) => string;
