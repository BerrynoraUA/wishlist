import { getNavigationTheme, getThemeMode } from "@/lib/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useGT } from "gt-react-native";
import { useUniwind } from "uniwind";

export default function TabsLayout() {
  const t = useGT();
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = getNavigationTheme(theme);
  const selectedTabBackground =
    themeMode === "dark"
      ? `${navigationTheme.colors.primary}24`
      : `${navigationTheme.colors.primary}18`;

  return (
    <NativeTabs
      backgroundColor={navigationTheme.colors.card}
      blurEffect={themeMode === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
      disableTransparentOnScrollEdge
      indicatorColor={selectedTabBackground}
      tintColor={navigationTheme.colors.primary}
    >
      <NativeTabs.Trigger name="wishlists">
        <NativeTabs.Trigger.Icon sf="gift.fill" md="featured_seasonal_and_gifts" />
        <NativeTabs.Trigger.Label>{t("Wishlists")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        <NativeTabs.Trigger.Label>{t("Profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
