import { CreateMenuHost } from "@/components/create/create-menu";
import { getThemeMode, useNavigationTheme } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { useUserGuide } from "@/components/user-guide/user-guide-provider";
import { Redirect, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useGT } from "gt-react-native";
import * as React from "react";
import { useUniwind } from "uniwind";

export const unstable_settings = {
  initialRouteName: "wishlists",
};

export default function TabsLayout() {
  const t = useGT();
  const { session } = useAuth();
  const pathname = usePathname();
  const { handleTabPress } = useUserGuide();
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = useNavigationTheme(theme);
  const [createOpen, setCreateOpen] = React.useState(false);
  const primaryColor =
    typeof navigationTheme.colors.primary === "string" ? navigationTheme.colors.primary : "#208aef";
  const selectedTabBackground = themeMode === "dark" ? `${primaryColor}24` : `${primaryColor}18`;

  if (!session) {
    return <Redirect href={"/(auth)/sign-in" as never} />;
  }

  if (pathname === "/") {
    return <Redirect href={"/(tabs)/wishlists" as never} />;
  }

  return (
    <>
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
          name="secret-santa"
          listeners={{
            tabPress: () => handleTabPress("secret-santa"),
          }}
        >
          <NativeTabs.Trigger.Icon sf="party.popper.fill" md="card_giftcard" />
          <NativeTabs.Trigger.Label>{t("Secret Santa")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* Disabled trigger: the native side blocks selection but still emits
            tabPress, which opens the create menu instead of navigating. */}
        <NativeTabs.Trigger
          name="create"
          disabled
          listeners={{
            tabPress: () => setCreateOpen(true),
          }}
        >
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
          <NativeTabs.Trigger.Label>{t("Create")}</NativeTabs.Trigger.Label>
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
      <CreateMenuHost open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
