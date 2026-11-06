import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Keeps status bar content light while a screen with a dark hero or image behind the
 * status bar is focused. Light theme would otherwise draw dark icons on the dark art.
 * Pass `active={false}` once the hero has scrolled away, so the icons go back to the theme's.
 */
export function HeroStatusBar({ active = true }: { active?: boolean }) {
  const focused = useIsFocused();
  return focused && active ? <StatusBar style="light" /> : null;
}
