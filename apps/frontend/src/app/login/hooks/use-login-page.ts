"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Owns the login page state: redirect and prefilled email query params.
 */
export function useLoginPage() {
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => searchParams.get("redirect_to") || "/home", [searchParams]);
  const prefillEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const registerHref = useMemo(() => {
    const params = new URLSearchParams();
    const accountMode = searchParams.get("account_mode");
    if (redirectTo) params.set("redirect_to", redirectTo);
    if (accountMode) params.set("account_mode", accountMode);
    const query = params.toString();
    return query ? `/register?${query}` : "/register";
  }, [redirectTo, searchParams]);

  return { redirectTo, prefillEmail, registerHref };
}
