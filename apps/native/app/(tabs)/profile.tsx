import { AccountSettings } from "@/components/settings/account-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { useAuth } from "@/providers/auth-provider";
import { useSettings, useProfile, useUpdateSettings } from "@/hooks/use-settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { ActivityIndicator, View } from "react-native";

const SETTINGS_SECTIONS = [
  "account",
  "profile",
  "notifications",
  "appearance",
  "currency",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export default function ProfileScreen() {
  const t = useGT();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateSettings = useUpdateSettings();

  function setThemePreference(value: ThemePreference) {
    updateSettings.mutate({ theme: value });
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in" as never);
  }

  function renderSection({ item }: { item: SettingsSection }) {
    switch (item) {
      case "account":
        return <AccountSettings email={user?.email ?? ""} signOut={handleSignOut} />;
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
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("Settings") }} />
      <View className="flex-1 bg-bg">
        <StyledFlashList
          data={SETTINGS_SECTIONS}
          renderItem={renderSection}
          keyExtractor={(item) => item}
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-6"
          ItemSeparatorComponent={SettingsSectionSeparator}
          ListHeaderComponent={
            settingsLoading || profileLoading ? (
              <View className="items-center justify-center py-6">
                <ActivityIndicator colorClassName="accent-brand" />
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

function SettingsSectionSeparator() {
  return <View className="h-4" />;
}
