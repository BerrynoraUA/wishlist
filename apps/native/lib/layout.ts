import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NAV_TAB_BAR_HEIGHT = 58;
export const NAV_TAB_BAR_BACKDROP_OFFSET = 4;
/** Headroom above the pill so the raised Create button can overhang it. */
export const NAV_TAB_BAR_FAB_OVERHANG = 14;
export const NAV_TAB_BAR_TOP_PADDING = NAV_TAB_BAR_FAB_OVERHANG + 4;
export const NAV_TAB_BAR_MIN_BOTTOM_INSET = 8;

/** Breathing room between the last row and the tab bar. */
const CONTENT_BOTTOM_SPACING = 16;

/**
 * Bottom padding a scrolling screen needs so its last row is not left under the tab bar.
 *
 * Only Android needs it: that bar is a floating pill drawn over the content, so nothing
 * insets the list automatically. iOS renders a real `NativeTabs` bar, which adjusts
 * scroll insets itself — padding it here would just leave a gap.
 */
export function useTabBarContentPadding(spacing = CONTENT_BOTTOM_SPACING) {
  const insets = useSafeAreaInsets();

  if (process.env.EXPO_OS !== "android") return spacing;

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
