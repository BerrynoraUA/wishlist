import { Alert } from "react-native";
import { useGT } from "gt-react-native";
import { countQueuedWrites } from "@/lib/offline-mutations";
import { failedWrites } from "@/lib/write-queue";
import type { SupabaseSession, SupabaseUser } from "@wishlist/backend/supabase";
import { deactivateCurrentPushToken } from "@/api/notifications";
import { readStoredNativeSession, supabase } from "@wishlist/backend/supabase/native";
import type { KnownAccountProvider } from "@wishlist/backend/types/known-accounts";
import { upsertKnownAccount } from "@/lib/known-accounts";
import { readBootLastUserId, writeBootLastUserId } from "@/lib/boot-cache";
import { isNetInfoOnline } from "@/components/providers/native-query-lifecycle";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  isLoading: boolean;
  signOut: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => false,
});

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

async function rememberSessionAccount(session: SupabaseSession | null) {
  const user = session?.user;
  if (!user?.id || !user.email || !session) return;

  await upsertKnownAccount({
    userId: user.id,
    email: user.email,
    displayName:
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    provider: resolveKnownAccountProvider(user.app_metadata),
    providers: resolveKnownAccountProviders(user.app_metadata),
    lastUsedAt: Date.now(),
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const t = useGT();
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  // Seeded with the last session's user, whose data the restored on-device query cache
  // holds, so a launch that resolves to another account or none still clears it.
  const activeUserIdRef = React.useRef<string | null>(readBootLastUserId());

  useEffect(() => {
    function applySession(nextSession: SupabaseSession | null) {
      const nextUserId = nextSession?.user.id ?? null;
      const previousUserId = activeUserIdRef.current;

      if (previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
      }

      activeUserIdRef.current = nextUserId;
      // Synchronous, so the next cold start can pick a theme before it knows who is
      // signed in. See `lib/boot-cache.ts`.
      writeBootLastUserId(nextUserId);
      setSession(nextSession);
      setIsLoading(false);
      void rememberSessionAccount(nextSession).catch(() => undefined);
    }

    // Bumped on every auth event, so a stored-session read that resolves late never
    // overrides what supabase-js reported after it.
    let authEventCount = 0;
    let disposed = false;

    async function restoreStoredSession(eventCount: number, applyIfMissing: boolean) {
      const stored = await readStoredNativeSession().catch(() => null);
      if (disposed || eventCount !== authEventCount) return;
      if (stored || applyIfMissing) applySession(stored);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventCount += 1;
      // Offline with an expired access token, the refresh fails for network reasons:
      // supabase-js keeps the stored session but reports none. Keep using it so the app
      // works offline; it refreshes once back online, and a real sign-out still arrives
      // as SIGNED_OUT.
      if (event === "INITIAL_SESSION" && !nextSession) {
        void restoreStoredSession(authEventCount, true);
        return;
      }
      applySession(nextSession);
    });

    // Offline, supabase-js retries that refresh for ~30s before reporting the initial
    // session. Start from the stored one instead of showing a spinner for that long.
    void NetInfo.fetch().then((state) => {
      if (!disposed && authEventCount === 0 && !isNetInfoOnline(state)) {
        void restoreStoredSession(0, false);
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = async () => {
    if (countQueuedWrites(queryClient) > 0 || failedWrites(queryClient).length > 0) {
      const discard = await new Promise<boolean>((resolve) =>
        Alert.alert(
          t("Discard unsynced changes?"),
          t("Signing out removes changes that have not reached the server."),
          [
            { text: t("Cancel"), style: "cancel", onPress: () => resolve(false) },
            { text: t("Discard and sign out"), style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (!discard) return false;
    }
    await deactivateCurrentPushToken().catch(() => undefined);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
