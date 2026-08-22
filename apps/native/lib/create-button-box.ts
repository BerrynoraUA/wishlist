import { isLiquidGlassAvailable } from "expo-glass-effect";
import { I18nManager, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";

/** Both the classic iOS tab bar and the Android custom bar lay out 5 equal-width slots. */
const NAV_SLOT_COUNT = 5;
/** wishlists, secret-santa, create, friends, profile — "create" is the middle slot. */
const CREATE_SLOT_INDEX = 2;
/** Radius of the raised "+" FAB inside a slot (`FAB_SIZE / 2` in android-tab-bar.tsx). */
const SLOT_BUTTON_RADIUS = 26;

/**
 * iOS 26 lifts the `role="search"` trigger out of the tab row and draws it as its own
 * circular button trailing the floating bar — the middle-slot geometry below misses it by
 * half the screen. `isLiquidGlassAvailable()` is the same condition that produces the
 * floating bar: older iOS (and a compatibility-mode build) keeps the classic 5-slot bar.
 */
const HAS_DETACHED_CREATE_BUTTON = isLiquidGlassAvailable();
/** The detached button is a circle as tall as the bar capsule next to it. */
const FLOATING_BUTTON_RADIUS = NAV_TAB_BAR_HEIGHT / 2;
/** The floating bar keeps the same gap to the window on every edge, inside the safe area. */
const FLOATING_BAR_MARGIN = 24;

export type CreateButtonBox = { x: number; y: number; radius: number };

/**
 * On-screen center and radius of the global "+" create button, mirroring the geometry
 * `getNavBox` uses in user-guide-provider.tsx to highlight the same slot.
 */
export function useCreateButtonCenter(): CreateButtonBox {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (HAS_DETACHED_CREATE_BUTTON) {
    const edgeOffset = FLOATING_BAR_MARGIN + FLOATING_BUTTON_RADIUS;
    return {
      x: I18nManager.isRTL ? insets.left + edgeOffset : width - insets.right - edgeOffset,
      y: height - FLOATING_BAR_MARGIN - FLOATING_BUTTON_RADIUS,
      radius: FLOATING_BUTTON_RADIUS,
    };
  }

  const tabWidth = width / NAV_SLOT_COUNT;
  const pillWidth = Math.min(72, tabWidth - 16);
  const bottom = Math.max(insets.bottom, 8);
  const slotX = tabWidth * CREATE_SLOT_INDEX + (tabWidth - pillWidth) / 2;
  const slotY = height - bottom - NAV_TAB_BAR_HEIGHT - 2;

  return {
    x: slotX + pillWidth / 2,
    y: slotY + NAV_TAB_BAR_HEIGHT / 2,
    radius: SLOT_BUTTON_RADIUS,
  };
}
