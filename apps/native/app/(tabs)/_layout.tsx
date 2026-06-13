import { getNavigationTheme, getThemeMode } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { useUserGuide } from "@/components/user-guide/user-guide-provider";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useGT } from "gt-react-native";
import { useUniwind } from "uniwind";

export default function TabsLayout() {
  const t = useGT();
  const { session } = useAuth();
  const { handleTabPress } = useUserGuide();
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = getNavigationTheme(theme);
  const selectedTabBackground =
    themeMode === "dark"
      ? `${navigationTheme.colors.primary}24`
      : `${navigationTheme.colors.primary}18`;

  if (!session) {
    return <Redirect href={"/sign-in" as never} />;
  }

  return (
    <NativeTabs
      backgroundColor={navigationTheme.colors.card}
      blurEffect={themeMode === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
      disableTransparentOnScrollEdge
      indicatorColor={selectedTabBackground}
      labelVisibilityMode="labeled"
      tintColor={navigationTheme.colors.primary}
    >
      <NativeTabs.Trigger
        name="wishlists"
        listeners={{
          tabPress: () => handleTabPress("wishlists"),
        }}
      >
        <NativeTabs.Trigger.Icon sf="gift.fill" md="featured_seasonal_and_gifts" />
        <NativeTabs.Trigger.Label>{t("Wishlists")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="discover"
        listeners={{
          tabPress: () => handleTabPress("discover"),
        }}
      >
        <NativeTabs.Trigger.Icon sf="sparkles" md="explore" />
        <NativeTabs.Trigger.Label>{t("Discover")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="friends"
        listeners={{
          tabPress: () => handleTabPress("friends"),
        }}
      >
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>{t("Friends")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="profile"
        listeners={{
          tabPress: () => handleTabPress("profile"),
        }}
      >
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        <NativeTabs.Trigger.Label>{t("Profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
