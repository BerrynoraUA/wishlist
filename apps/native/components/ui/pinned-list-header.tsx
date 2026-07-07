import { SCROLLABLE_TABS_TOP_GAP } from "@/components/ui/scrollable-tabs";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
/** Vertical padding between the header content and the bottom edge of the bar. */
const HEADER_BOTTOM_GAP = 16;
/** Height of one tab/filter row, used to estimate list padding before first layout. */
const HEADER_ROW_HEIGHT = 44;
/** Vertical gap between stacked header rows (matches the `gap-4` content wrapper). */
const HEADER_ROW_GAP = 16;
const IOS_HEADER_CONTENT_GAP = 16;

/**
 * List top padding for screens using `PinnedListHeader`. Starts from an estimate so
 * content doesn't jump on mount, then tracks the header's measured height (which can
 * change, e.g. when a filters panel expands).
 */
export function usePinnedListHeaderPadding(estimatedRows = 1) {
  const insets = useSafeAreaInsets();
  const listContentGap = Platform.OS === "ios" ? IOS_HEADER_CONTENT_GAP : 0;
  const [height, setHeight] = React.useState(
    insets.top +
      SCROLLABLE_TABS_TOP_GAP +
      estimatedRows * HEADER_ROW_HEIGHT +
      (estimatedRows - 1) * HEADER_ROW_GAP +
      HEADER_BOTTOM_GAP +
      listContentGap,
  );
  const onHeaderLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      setHeight(event.nativeEvent.layout.height + listContentGap);
    },
    [listContentGap],
  );

  return { paddingTop: height, onHeaderLayout };
}

/**
 * Bar pinned above a scrolling list, Telegram-style top tabs. It overlays the list
 * (which scrolls underneath) with liquid glass where supported and a solid themed
 * background elsewhere.
 */
export function PinnedListHeader({
  contentWidth,
  onLayout,
  children,
}: {
  /** Width of the centered content column. Omit to let children span the full row. */
  contentWidth?: number;
  /** Wire to `usePinnedListHeaderPadding().onHeaderLayout` to pad the list underneath. */
  onLayout?: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-0 top-0 z-10 overflow-hidden pb-4"
      style={{ paddingTop: insets.top + SCROLLABLE_TABS_TOP_GAP }}
      onLayout={onLayout}
    >
      {HAS_LIQUID_GLASS ? (
        <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} />
      ) : (
        <View pointerEvents="none" className="absolute inset-0 bg-bg" />
      )}
      <View
        className="gap-4 self-center"
        style={contentWidth !== undefined ? { width: contentWidth } : undefined}
      >
        {children}
      </View>
    </View>
  );
}
