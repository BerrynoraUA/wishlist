import { AccountSettings } from "@/components/settings/account-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { FeatureIdeasSettings } from "@/components/settings/feature-ideas-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SettingsSectionProvider } from "@/components/settings/settings-section";
import { SubscriptionSettings } from "@/components/settings/subscription-settings";
import { useAuth } from "@/providers/auth-provider";
import { useKnownAccounts } from "@/hooks/use-known-accounts";
import { useSettings, useProfile, useUpdateSettings } from "@/hooks/use-settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SETTINGS_SECTIONS = [
  "account",
  "profile",
  "subscription",
  "notifications",
  "appearance",
  "currency",
  "feature-ideas",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

// Internal feature flag: when true, only one settings section can be open at a
// time (opening one collapses the others). When false, sections open/close
// independently.
const SINGLE_OPEN_SETTINGS_SECTION = true;

// Section that starts expanded.
const DEFAULT_OPEN_SECTION: SettingsSection = "profile";

export default function ProfileScreen() {
  const t = useGT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut, user } = useAuth();
  const { rememberAccount } = useKnownAccounts();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateSettings = useUpdateSettings();

  function setThemePreference(value: ThemePreference) {
    updateSettings.mutate({ theme: value });
  }

  React.useEffect(() => {
    if (!session?.user.id || !session.user.email) return;

    const provider = String(session.user.app_metadata?.provider ?? "email");
    const supportedProvider = provider === "google" ? "google" : "email";
    const profileForSession = profile?.id === session.user.id ? profile : null;
    const settingsForSession = settings?.user_id === session.user.id ? settings : null;

    void rememberAccount({
      userId: session.user.id,
      email: session.user.email,
      displayName: profileForSession?.display_name ?? profileForSession?.nickname ?? null,
      avatarUrl: profileForSession?.avatar_url ?? null,
      provider: supportedProvider,
      providers: [supportedProvider],
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
      defaultAccent: settingsForSession?.default_accent ?? null,
      themePreference: settingsForSession?.theme ?? null,
      lastUsedAt: Date.now(),
    });
  }, [
    profile?.avatar_url,
    profile?.display_name,
    profile?.nickname,
    rememberAccount,
    session?.access_token,
    session?.expires_at,
    session?.refresh_token,
    session?.user.email,
    session?.user.id,
    settings?.default_accent,
    settings?.theme,
  ]);

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in" as never);
  }

  function renderSection({ item }: { item: SettingsSection }) {
    switch (item) {
      case "account":
        return (
          <AccountSettings
            email={user?.email ?? ""}
            userId={user?.id ?? ""}
            signOut={handleSignOut}
          />
        );
      case "subscription":
        return <SubscriptionSettings />;
      case "profile":
        return <ProfileSettings profile={profile} />;
      case "notifications":
        return <NotificationSettings settings={settings} />;
      case "appearance":
        return (
          <AppearanceSettings
            selectedTheme={settings?.theme ?? "system"}
            selectedAccent={settings?.default_accent ?? WishlistAccent.Pink}
            selectedWishlistColor={settings?.default_wishlist_color ?? 0}
            selectedPriorities={settings?.selected_priorities}
            setThemePreference={setThemePreference}
          />
        );
      case "currency":
        return <CurrencySettings selectedCurrency={settings?.display_currency ?? "USD"} />;
      case "feature-ideas":
        return <FeatureIdeasSettings />;
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("Settings") }} />
      <View className="flex-1 bg-bg">
        <SettingsSectionProvider
          enabled={SINGLE_OPEN_SETTINGS_SECTION}
          defaultOpenSection={DEFAULT_OPEN_SECTION}
        >
          <StyledFlashList
            data={SETTINGS_SECTIONS}
            renderItem={renderSection}
            keyExtractor={(item) => item}
            className="flex-1"
            contentContainerClassName="px-4 pb-6"
            contentContainerStyle={{ paddingTop: insets.top + 24 }}
            ItemSeparatorComponent={SettingsSectionSeparator}
            ListHeaderComponent={
              settingsLoading || profileLoading ? (
                <View className="items-center justify-center py-6">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null
            }
          />
        </SettingsSectionProvider>
      </View>
    </>
  );
}

function SettingsSectionSeparator() {
  return <View className="h-4" />;
}
