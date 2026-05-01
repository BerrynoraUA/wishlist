"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJoinSecretSantaEvent } from "@/hooks/use-secret-santa";

/**
 * Auto-accepts a Secret Santa invite from the `?event=` query parameter and
 * redirects to the event detail page when the mutation settles.
 */
export function useSecretSantaJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const joinMutation = useJoinSecretSantaEvent();
  const attempted = useRef(false);

  useEffect(() => {
    if (!eventId || attempted.current) return;
    attempted.current = true;

    joinMutation.mutate(eventId, {
      onSuccess: () => router.replace(`/secret-santa/${eventId}`),
      onError: () => router.replace(`/secret-santa/${eventId}`),
    });
  }, [eventId, joinMutation, router]);

  return { eventId };
}
