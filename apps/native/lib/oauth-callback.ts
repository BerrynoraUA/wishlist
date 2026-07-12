function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function isExpectedOAuthCallbackUrl(url: string, redirectTo: string) {
  try {
    const actual = new URL(url);
    const expected = new URL(redirectTo);

    return (
      actual.protocol === expected.protocol &&
      actual.hostname === expected.hostname &&
      actual.port === expected.port &&
      normalizePathname(actual.pathname) === normalizePathname(expected.pathname)
    );
  } catch {
    return false;
  }
}

export function getOAuthAuthorizationCode(url: string, redirectTo: string) {
  if (!isExpectedOAuthCallbackUrl(url, redirectTo)) {
    throw new Error("OAuth callback URL did not match the requested sign-in flow.");
  }

  const parsedUrl = new URL(url);
  const authError =
    parsedUrl.searchParams.get("error_description") ?? parsedUrl.searchParams.get("error");
  if (authError) throw new Error(authError);

  const code = parsedUrl.searchParams.get("code");
  if (!code) throw new Error("OAuth callback did not return an authorization code.");
  return code;
}
