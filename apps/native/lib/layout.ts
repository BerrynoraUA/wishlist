import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NAV_TAB_BAR_HEIGHT = 58;
export const NAV_TAB_BAR_BACKDROP_OFFSET = 4;
/** Headroom above the pill so the raised Create button can overhang it. */
export const NAV_TAB_BAR_FAB_OVERHANG = 14;
export const NAV_TAB_BAR_TOP_PADDING = NAV_TAB_BAR_FAB_OVERHANG + 4;
export const NAV_TAB_BAR_MIN_BOTTOM_INSET = 8;

/** Breathing room between the last row and the tab bar. */
const CONTENT_BOTTOM_SPACING = 16;

/** The shared window-edge clearance used by bottom tabs and native sheets. */
export function useBottomSafeAreaPadding() {
  const insets = useSafeAreaInsets();

  return Math.max(insets.bottom, NAV_TAB_BAR_MIN_BOTTOM_INSET);
}

/**
 * Bottom padding a scrolling screen needs so its last row is not left under the tab bar.
 *
 * Both bars are drawn over the content, and neither insets a list on its own. iOS could
 * do it natively, but only for the first scroll view in the first descendant chain of the
 * tab screen — screens that render a `PinnedListHeader` or a backdrop first silently miss
 * out. `IosTabBar` therefore opts every tab out of it (`disableAutomaticContentInsets`) and
 * both platforms pad here instead: the translucent iOS bar is part of the screen's bottom
 * safe-area inset, while the Android pill is a plain floating view we measure ourselves.
 */
export function useTabBarContentPadding(spacing = CONTENT_BOTTOM_SPACING) {
  const insets = useSafeAreaInsets();

  if (process.env.EXPO_OS !== "android") return insets.bottom + spacing;

  return (
    NAV_TAB_BAR_TOP_PADDING +
    NAV_TAB_BAR_HEIGHT +
    Math.max(insets.bottom, NAV_TAB_BAR_MIN_BOTTOM_INSET) +
    spacing
  );
}

export function chunkRows<T>(items: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}
