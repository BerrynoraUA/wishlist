"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Owns the register page state: redirect query param.
 */
export function useRegisterPage() {
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => searchParams.get("redirect_to") || "/home", [searchParams]);
  const loginHref = useMemo(() => {
    const params = new URLSearchParams();
    const accountMode = searchParams.get("account_mode");
    if (redirectTo) params.set("redirect_to", redirectTo);
    if (accountMode) params.set("account_mode", accountMode);
    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  }, [redirectTo, searchParams]);

  return {
    redirectTo,
    loginHref,
  };
}
