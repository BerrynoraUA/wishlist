"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildHomeCleanupUrl, getInitialFriendRequestSent, getInitialInvite } from "../helpers";
import { FRIEND_REQUEST_SENT_FLAG } from "../constants";

/**
 * After the home page reads the `friendInvite` / `friendRequestSent` query
 * params on mount, strip them from the URL so a reload doesn't reopen the
 * same modals. Runs at most once per mount.
 */
export function useHomeQueryParamCleanup() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cleaned = useRef(false);

  useEffect(() => {
    if (cleaned.current) return;

    const hasInvite = Boolean(getInitialInvite(searchParams));
    const hasRequestSent = getInitialFriendRequestSent(searchParams, FRIEND_REQUEST_SENT_FLAG);
    if (!hasInvite && !hasRequestSent) return;

    cleaned.current = true;
    router.replace(buildHomeCleanupUrl(searchParams), { scroll: false });
  }, [searchParams, router]);
}
