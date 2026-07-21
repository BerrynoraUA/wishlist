import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";

/** Both the iOS native tab bar and the Android custom bar lay out 5 equal-width slots. */
const NAV_SLOT_COUNT = 5;
/** wishlists, secret-santa, create, friends, profile — "create" is the middle slot. */
const CREATE_SLOT_INDEX = 2;

/**
 * On-screen center of the global "+" create button, mirroring the geometry
 * `getNavBox` uses in user-guide-provider.tsx to highlight the same slot.
 */
export function useCreateButtonCenter(): { x: number; y: number } {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const tabWidth = width / NAV_SLOT_COUNT;
  const pillWidth = Math.min(72, tabWidth - 16);
  const bottom = Math.max(insets.bottom, 8);
  const slotX = tabWidth * CREATE_SLOT_INDEX + (tabWidth - pillWidth) / 2;
  const slotY = height - bottom - NAV_TAB_BAR_HEIGHT - 2;

  return {
    x: slotX + pillWidth / 2,
    y: slotY + NAV_TAB_BAR_HEIGHT / 2,
  };
}
