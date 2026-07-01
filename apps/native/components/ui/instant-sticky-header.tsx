import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from "react-native";

type ScrollListener = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const IS_IOS = Platform.OS === "ios";

/**
 * Vertical padding above and below a sticky header's content. Matches the `pb-4`
 * (16px) bottom so the from-notch and bottom margins stay equal (Telegram-style).
 */
export const STICKY_HEADER_GAP = 16;

/**
 * Full-bleed backdrop for a sticky header, rendered as an absolute-fill sibling
 * behind the header content — so the wrapper never needs its own `bg-bg`.
 *
 * The `floating` copy (the one that overlays scrolling content) gets a translucent
 * Telegram-style material: liquid glass on iOS 26+, otherwise a frosted blur. Every
 * other case — the inline copy, or Android — falls back to the opaque page background.
 * It always renders a fill, so the header can never end up accidentally transparent.
 */
export function StickyHeaderBackground({ floating = false }: { floating?: boolean }) {
  if (floating && HAS_LIQUID_GLASS) {
    return <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }
  if (floating && IS_IOS) {
    return (
      <BlurView
        pointerEvents="none"
        tint="systemChromeMaterial"
        intensity={80}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View pointerEvents="none" className="bg-bg" style={StyleSheet.absoluteFill} />;
}

export function useInstantStickyHeader({
  scrollListener,
  initialThreshold = 0,
  thresholdOffset = 0,
}: {
  scrollListener?: ScrollListener;
  initialThreshold?: number;
  thresholdOffset?: number;
} = {}) {
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [overlayHeight, setOverlayHeight] = React.useState(0);
  const [threshold, setThreshold] = React.useState(initialThreshold);

  const onHeaderLayout = React.useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  const onOverlayLayout = React.useCallback((event: LayoutChangeEvent) => {
    setOverlayHeight(event.nativeEvent.layout.height);
  }, []);

  const onAnchorLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      setThreshold(thresholdOffset + y + height);
    },
    [thresholdOffset],
  );

  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
      scrollListener?.(event);
    },
    [scrollListener, scrollY],
  );

  const clampedThreshold = Math.max(0.01, threshold);
  // Hide by the overlay's own height when it differs from the inline header
  // (e.g. the overlay carries extra top inset to clear the status bar).
  const hideOffset = overlayHeight || headerHeight;
  const translateY = scrollY.interpolate({
    inputRange: [Math.max(0, clampedThreshold - 0.01), clampedThreshold],
    outputRange: [-hideOffset, 0],
    extrapolate: "clamp",
  });

  return {
    onAnchorLayout,
    onHeaderLayout,
    onOverlayLayout,
    onScroll,
    overlayStyle: { transform: [{ translateY }] },
    ready: headerHeight > 0,
  };
}

export function InstantStickyHeaderOverlay({
  children,
  ready,
  style,
  onLayout,
}: {
  children: React.ReactNode;
  ready: boolean;
  style: React.ComponentProps<typeof Animated.View>["style"];
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  if (!ready) return null;

  return (
    <Animated.View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-20" style={style}>
      <View pointerEvents="auto" onLayout={onLayout}>
        {children}
      </View>
    </Animated.View>
  );
}
