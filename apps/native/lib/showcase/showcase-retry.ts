interface RetryOptions {
  readonly attempts?: number;
  readonly delayMs?: number;
  readonly isCancelled?: () => boolean;
}

/**
 * Showcase startup races a cold Metro bundle and a just-booted device, so every host
 * round trip is retried rather than failing the whole capture on a transient error.
 */
export async function retryShowcaseOperation(
  operation: () => Promise<boolean>,
  { attempts = 30, delayMs = 500, isCancelled = () => false }: RetryOptions = {},
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (isCancelled()) return false;
    try {
      if (await operation()) return true;
    } catch {
      // Retried below; the runner fails the capture if readiness never arrives.
    }
    if (isCancelled()) return false;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}
