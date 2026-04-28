"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getCurrentSession, getCurrentUser } from "@/api/user";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { clearAllSessionDrafts, clearSessionDraftsForUser } from "@/lib/session-drafts";
import { upsertKnownAccount } from "@/lib/known-accounts";
import type { KnownAccountProvider } from "@/types/known-accounts";

const KNOWN_ACCOUNT_PROVIDERS = new Set<KnownAccountProvider>([
  "email",
  "google",
  "apple",
  "facebook",
]);

function resolveKnownAccountProvider(
  appMetadata: Record<string, unknown> | undefined,
): KnownAccountProvider {
  const raw = appMetadata?.provider;
  if (typeof raw === "string" && KNOWN_ACCOUNT_PROVIDERS.has(raw as KnownAccountProvider)) {
    return raw as KnownAccountProvider;
  }
  return "email";
}

function resolveKnownAccountProviders(
  appMetadata: Record<string, unknown> | undefined,
): KnownAccountProvider[] {
  const raw = appMetadata?.providers;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (value): value is KnownAccountProvider =>
      typeof value === "string" && KNOWN_ACCOUNT_PROVIDERS.has(value as KnownAccountProvider),
  );
}

function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const lastAuthUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((initialUser) => {
      lastAuthUserIdRef.current = initialUser?.id ?? null;

      if (initialUser?.id && initialUser.email) {
        getCurrentSession().then((session) => {
          upsertKnownAccount({
            userId: initialUser.id,
            email: initialUser.email,
            provider: resolveKnownAccountProvider(initialUser.app_metadata),
            providers: resolveKnownAccountProviders(initialUser.app_metadata),
            lastUsedAt: Date.now(),
            accessToken: session?.access_token ?? null,
            refreshToken: session?.refresh_token ?? null,
            expiresAt: session?.expires_at ?? null,
          });
        });
      }
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = lastAuthUserIdRef.current;

      if (event === "SIGNED_OUT") {
        if (previousUserId) clearSessionDraftsForUser(previousUserId);
        else clearAllSessionDrafts();
      }

      if (event === "SIGNED_IN" && previousUserId && nextUserId && previousUserId !== nextUserId) {
        clearSessionDraftsForUser(previousUserId);
        clearSessionDraftsForUser(nextUserId);
      }

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
        nextUser?.id &&
        nextUser.email &&
        session
      ) {
        upsertKnownAccount({
          userId: nextUser.id,
          email: nextUser.email,
          provider: resolveKnownAccountProvider(nextUser.app_metadata),
          providers: resolveKnownAccountProviders(nextUser.app_metadata),
          lastUsedAt: Date.now(),
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ?? null,
        });
      }

      lastAuthUserIdRef.current = nextUserId;

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSyncProvider>{children}</AuthSyncProvider>
    </QueryClientProvider>
  );
}
