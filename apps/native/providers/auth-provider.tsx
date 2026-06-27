import type { SupabaseSession, SupabaseUser } from "@wishlist/backend/supabase";
import { deactivateCurrentPushToken } from "@/api/notifications";
import { supabase } from "@wishlist/backend/supabase/native";
import type { KnownAccountProvider } from "@wishlist/backend/types/known-accounts";
import { upsertKnownAccount } from "@/lib/known-accounts";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
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
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      void rememberSessionAccount(session).catch(() => {});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      void rememberSessionAccount(session).catch(() => {});
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await deactivateCurrentPushToken().catch(() => undefined);
    await supabase.auth.signOut();
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
