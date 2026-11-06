import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Keeps status bar content light while a screen with a dark hero or image behind the
 * status bar is focused. Light theme would otherwise draw dark icons on the dark art.
 */
export function HeroStatusBar() {
  const focused = useIsFocused();
  return focused ? <StatusBar style="light" /> : null;
}
