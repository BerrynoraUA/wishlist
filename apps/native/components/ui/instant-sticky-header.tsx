import * as React from "react";
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from "react-native";

type ScrollListener = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

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
