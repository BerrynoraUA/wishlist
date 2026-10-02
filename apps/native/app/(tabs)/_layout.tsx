import { CreateMenuHost } from "@/components/create/create-menu";
import { AndroidTabBar, type AndroidTabBarProps } from "@/components/navigation/android-tab-bar";
import { IosTabBar } from "@/components/navigation/ios-tab-bar";
import { useNavigationTheme } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { useUserGuide } from "@/components/user-guide/user-guide-provider";
import { Redirect, Tabs, usePathname } from "expo-router";
import * as React from "react";
import { Platform } from "react-native";
import { useUniwind } from "uniwind";

export const unstable_settings = {
  initialRouteName: "wishlists",
};

export default function TabsLayout() {
  const { session } = useAuth();
  const [createOpen, setCreateOpen] = React.useState(false);

  if (!session) {
    return <Redirect href={"/(auth)/sign-in" as never} />;
  }

  return (
    <RootPathRedirect>
      <CreateMenuHost open={createOpen} onOpenChange={setCreateOpen}>
        {Platform.OS === "ios" ? (
          <IosTabBar onCreatePress={() => setCreateOpen(true)} />
        ) : (
          <AndroidTabs onCreatePress={() => setCreateOpen(true)} />
        )}
      </CreateMenuHost>
    </RootPathRedirect>
  );
}

/**
 * Sends `/` to the wishlists tab before the tabs render. The pathname changes on every
 * navigation, so it is read here rather than in `TabsLayout`: only this component
 * re-renders, and `children` is the same element each time, so React skips the tab
 * navigator instead of re-rendering it ahead of every pushed screen.
 */
function RootPathRedirect({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <Redirect href={"/(tabs)/wishlists" as never} />;
  }

  return children;
}

/**
 * Android uses JS tabs with a fully custom tab bar (floating pill, raised
 * gradient Create button) instead of the generic Material 3 native bar.
 */
function AndroidTabs({ onCreatePress }: { onCreatePress: () => void }) {
  const { handleTabPress } = useUserGuide();
  const { theme } = useUniwind();
  const navigationTheme = useNavigationTheme(theme);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: navigationTheme.colors.background },
      }}
      tabBar={(props) => (
        <AndroidTabBar
          state={props.state as AndroidTabBarProps["state"]}
          navigation={props.navigation as unknown as AndroidTabBarProps["navigation"]}
          onCreatePress={onCreatePress}
          onTabPress={handleTabPress}
        />
      )}
    >
      <Tabs.Screen name="wishlists" />
      <Tabs.Screen name="secret-santa" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
