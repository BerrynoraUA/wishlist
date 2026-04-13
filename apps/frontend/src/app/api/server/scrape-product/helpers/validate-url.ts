/**
 * URL safety validator — prevents SSRF by blocking requests to private/internal
 * network addresses and non-HTTP(S) schemes.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
  "169.254.169.254", // AWS/Azure/GCP instance metadata
]);

const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16–31.x.x private
  /^192\.168\./, // 192.168.0.0/16 private
  /^169\.254\./, // 169.254.0.0/16 link-local
  /^0\./, // 0.x.x.x reserved
  /^::1$/, // IPv6 loopback
  /^\[::1\]$/,
  /^fc[0-9a-f]{2}/i, // IPv6 unique-local fc00::/7
  /^fd[0-9a-f]{2}/i,
];

/**
 * Returns true only if the URL is safe to fetch server-side:
 * - scheme is http or https
 * - hostname is not a loopback, private, or reserved address
 */
export function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase();
  if (!host) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) return false;
  }

  return true;
}
