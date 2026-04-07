import type { User } from "@supabase/supabase-js";
import { PostHog } from "posthog-node";
import { posthogPersonPropsFromSupabaseUser } from "@/lib/posthog-person-from-supabase";

export function getPostHogClient(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}

/** Align server-relayed analytics with the same distinct id and person props as the browser SDK. */
export function identifyServerUser(ph: PostHog, user: User): void {
  ph.identify({
    distinctId: user.id,
    properties: posthogPersonPropsFromSupabaseUser(user),
  });
}
