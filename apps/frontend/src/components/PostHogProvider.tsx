"use client";

import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { posthogPersonPropsFromSupabaseUser } from "@/lib/posthog-person-from-supabase";
import { supabaseBrowser } from "@/lib/supabase-browser";

function PostHogIdentity() {
  const phog = usePostHog();

  useEffect(() => {
    if (!phog) return;

    const syncUser = (user: User | null) => {
      if (user) {
        phog.identify(user.id, posthogPersonPropsFromSupabaseUser(user));
      } else {
        phog.reset();
      }
    };

    let cancelled = false;

    void supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!cancelled) syncUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [phog]);

  return null;
}

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "always",
    capture_pageview: false, // manually capture below
    capture_pageleave: true,
  });
}

function PageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const phog = usePostHog();

  useEffect(() => {
    if (pathname && phog) {
      let url = window.origin + pathname;
      const search = searchParams?.toString();
      if (search) url += "?" + search;
      phog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, phog]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogIdentity />
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
