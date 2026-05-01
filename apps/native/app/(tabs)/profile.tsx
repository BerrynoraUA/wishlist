import { AccountSettings } from "@/components/settings/account-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { useAuth } from "@/providers/auth-provider";
import { useSettings, useProfile, useUpdateSettings } from "@/hooks/use-settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateSettings = useUpdateSettings();

  function setThemePreference(value: ThemePreference) {
    updateSettings.mutate({ theme: value });
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <View className="flex-1 bg-bg">
        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-6 pt-6">
          {(settingsLoading || profileLoading) && (
            <View className="items-center justify-center py-6">
              <ActivityIndicator colorClassName="accent-brand" />
            </View>
          )}

          <AccountSettings email={user?.email ?? ""} signOut={signOut} />
          <ProfileSettings profile={profile} />
          <NotificationSettings settings={settings} />
          <AppearanceSettings
            selectedTheme={settings?.theme ?? "system"}
            selectedAccent={settings?.default_accent ?? WishlistAccent.Pink}
            selectedWishlistColor={settings?.default_wishlist_color ?? 0}
            selectedPriorities={settings?.selected_priorities}
            setThemePreference={setThemePreference}
          />
          <CurrencySettings selectedCurrency={settings?.display_currency ?? "USD"} />
        </ScrollView>
      </View>
    </>
  );
}
