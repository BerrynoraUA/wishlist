import { SCROLLABLE_TABS_TOP_GAP } from "@/components/ui/scrollable-tabs";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Platform, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const IS_IOS = Platform.OS === "ios";
/**
 * Space between the safe-area top and the first header row. iOS follows the native
 * navigation bar: a 44pt bar starting right under the status bar, controls centered in it.
 */
const HEADER_TOP_GAP = IS_IOS ? 0 : SCROLLABLE_TABS_TOP_GAP;
/** Height of one tab/filter row, used to estimate list padding before first layout. */
const HEADER_ROW_HEIGHT = process.env.EXPO_OS === "android" ? 48 : 44;
/**
 * The one vertical rhythm of the header: between stacked rows (the `gap-4` wrapper), from
 * the last row to an open panel (`SLIDE_OUT_PANEL_GAP`), and from either to the list.
 */
const HEADER_ROW_GAP = 16;

/**
 * List top padding for screens using `PinnedListHeader`. Starts from an estimate so
 * content doesn't jump on mount, then tracks the header's measured height. A slide-out
 * panel passed as `panel` is left out of that measurement — the list follows it with a
 * `SlideOutSpacer` on the UI thread instead of re-laying out its padding every frame.
 */
export function usePinnedListHeaderPadding(estimatedRows = 1) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = React.useState(
    insets.top +
      HEADER_TOP_GAP +
      estimatedRows * HEADER_ROW_HEIGHT +
      estimatedRows * HEADER_ROW_GAP,
  );
  const onHeaderLayout = React.useCallback((event: LayoutChangeEvent) => {
    setHeight(event.nativeEvent.layout.height + HEADER_ROW_GAP);
  }, []);

  return { paddingTop: height, onHeaderLayout };
}

/**
 * Bar pinned above a scrolling list, Telegram-style top tabs. It overlays the list
 * (which scrolls underneath). Where liquid glass is supported there is no bar: the
 * controls float on their own glass and the list fades out under them, like the
 * iOS 26 scroll edge effect. Elsewhere it gets a solid themed background.
 */
export function PinnedListHeader({
  contentWidth,
  onLayout,
  panel,
  children,
}: {
  /** Width of the centered content column. Omit to let children span the full row. */
  contentWidth?: number;
  /** Wire to `usePinnedListHeaderPadding().onHeaderLayout` to pad the list underneath. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /**
   * A `SlideOutFilterPanel` under the header rows. It sits outside the measured block, so
   * the list padding stays put while it animates; the glass background still covers it.
   */
  panel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="absolute inset-x-0 top-0 z-10">
      {/* Both run past the header by the list's top gap, so they clear content at rest. */}
      {HAS_LIQUID_GLASS ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-0 bg-linear-to-b from-bg from-50% to-bg/0"
          style={{ bottom: -HEADER_ROW_GAP }}
        />
      ) : (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-0 bg-bg"
          style={{ bottom: -HEADER_ROW_GAP }}
        />
      )}
      <View style={{ paddingTop: insets.top + HEADER_TOP_GAP }} onLayout={onLayout}>
        <View
          className="gap-4 self-center"
          style={contentWidth !== undefined ? { width: contentWidth } : undefined}
        >
          {children}
        </View>
      </View>
      {panel ? (
        <View
          className="self-center"
          style={contentWidth !== undefined ? { width: contentWidth } : undefined}
        >
          {panel}
        </View>
      ) : null}
    </View>
  );
}
