import { hapticSelection } from "@/lib/haptics";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { useUserGuideTargetRegistration } from "@/components/user-guide/user-guide-provider";
import { AnimatedGlassView, HAS_LIQUID_GLASS } from "@/components/ui/liquid-glass";
import {
  liquidStretch,
  liquidStretchTransform,
  motionSpring,
  useReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { GlassViewProps } from "expo-glass-effect";
import * as React from "react";
import { Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// iOS follows Telegram's top bar: every tab sits in one shared capsule (liquid glass on
// iOS 26+), and a tinted pill slides inside it behind the active tab.
const IS_IOS = Platform.OS === "ios";
const IS_ANDROID = Platform.OS === "android";
const MATERIAL_INDICATOR_TIMING = {
  duration: 220,
  easing: Easing.bezier(0.2, 0, 0, 1),
};
const TRACK_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 999 }];
/** Gap between the track's edge and the active pill, on every side. */
const TRACK_INSET = 4;
/** The fallback track's `border`; liquid glass draws its own edge. */
const TRACK_BORDER_WIDTH = HAS_LIQUID_GLASS ? 0 : 1;

/**
 * Vertical gap between the safe-area top inset and the top tabs. Shared by screens
 * that render `ScrollableTabs` so the tabs sit at the exact same position everywhere.
 */
export const SCROLLABLE_TABS_TOP_GAP = 16;

export type ScrollableTab<T> = {
  value: T;
  label: string;
  count?: number;
  accessibilityLabel?: string;
  guideTargetId?: string;
};

export function ScrollableTabs<T>({
  tabs,
  value,
  onChange,
  align = "left",
  className,
  opacity,
}: {
  tabs: ScrollableTab<T>[];
  value: T;
  onChange: (value: T) => void;
  align?: "left" | "right";
  className?: string;
  /** Opacity of an enclosing fade; used to reinstall glass after it becomes visible. */
  opacity?: SharedValue<number>;
}) {
  const scrollRef = React.useRef<ScrollView>(null);
  const tabLayoutsRef = React.useRef(new Map<T, { width: number; x: number }>());
  const viewportWidthRef = React.useRef(0);
  const viewportScrollTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const { activeTargetId, requestMeasure } = useUserGuideTargetRegistration();
  const trackingTab = tabs.some((tab) => tab.guideTargetId === activeTargetId);

  // Shared geometry for the iOS capsule and the Android underline.
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorReady = useSharedValue(0);
  const indicatorStretch = useSharedValue(0);
  const indicatorTargetRef = React.useRef<number | null>(null);
  // The iOS track hugs the tabs (up to the full row), so it waits for their total width.
  const [tabsWidth, setTabsWidth] = React.useState<number | null>(null);

  const moveIndicator = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      if (!layout) return;

      const targetX = IS_ANDROID ? layout.x + 12 : layout.x;
      const targetWidth = IS_ANDROID ? Math.max(0, layout.width - 24) : layout.width;
      // Snap on first measure. Android glides; iOS uses a liquid spring.
      if (animated && indicatorTargetRef.current !== null && !reduceMotion) {
        indicatorX.set(
          IS_ANDROID
            ? withTiming(targetX, MATERIAL_INDICATOR_TIMING)
            : withSpring(targetX, motionSpring.navPill),
        );
        indicatorWidth.set(
          IS_ANDROID
            ? withTiming(targetWidth, MATERIAL_INDICATOR_TIMING)
            : withSpring(targetWidth, motionSpring.navPill),
        );
        // Only a real move between tabs gets the droplet, not a re-measure in place.
        if (IS_IOS && indicatorTargetRef.current !== layout.x)
          indicatorStretch.set(liquidStretch());
      } else {
        indicatorX.set(targetX);
        indicatorWidth.set(targetWidth);
      }
      indicatorTargetRef.current = layout.x;
      indicatorReady.set(1);
    },
    [value, reduceMotion, indicatorX, indicatorWidth, indicatorReady, indicatorStretch],
  );

  const scrollToActiveTab = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      const viewportWidth = viewportWidthRef.current;
      if (!layout || viewportWidth === 0) return;

      scrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - (viewportWidth - layout.width) / 2),
        animated,
      });
    },
    [value],
  );

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToActiveTab(!reduceMotion);
      if (IS_IOS || IS_ANDROID) moveIndicator(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollToActiveTab, moveIndicator, reduceMotion]);

  React.useEffect(() => {
    return () => {
      if (viewportScrollTimeout.current !== null) clearTimeout(viewportScrollTimeout.current);
    };
  }, [scrollToActiveTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorX.get() },
      ...(IS_IOS ? liquidStretchTransform(indicatorStretch.get()) : []),
    ],
    width: indicatorWidth.get(),
    opacity: indicatorReady.get(),
  }));

  function handleViewportLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    if (width === viewportWidthRef.current) return;
    const initialLayout = viewportWidthRef.current === 0;
    viewportWidthRef.current = width;
    if (viewportScrollTimeout.current !== null) clearTimeout(viewportScrollTimeout.current);
    if (initialLayout) {
      scrollToActiveTab(false);
      return;
    }
    // Search reveal resizes the viewport every frame. Re-center after layout settles,
    // without re-rendering the tabs or restarting their indicator animation.
    viewportScrollTimeout.current = setTimeout(() => {
      viewportScrollTimeout.current = null;
      scrollToActiveTab(false);
    }, 100);
  }

  // UIKit can drop an effect when any ancestor reaches zero alpha. Reset the effect
  // on the UI thread alongside that fade, including the indicator's initial layout.
  const glassProps = useAnimatedProps<GlassViewProps>(() => ({
    glassEffectStyle: (opacity?.get() ?? 1) > 0.01 ? "regular" : "none",
  }));

  const scrollView = (
    <ScrollView
      ref={scrollRef}
      horizontal
      bounces
      contentContainerClassName="px-1"
      contentContainerStyle={align === "right" ? styles.rightAlignedContent : undefined}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={IS_IOS ? (width) => setTabsWidth(width) : undefined}
      onScroll={trackingTab ? requestMeasure : undefined}
      scrollEventThrottle={trackingTab ? 16 : undefined}
      showsHorizontalScrollIndicator={false}
    >
      {IS_IOS ? (
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full bg-text/10"
          style={[styles.indicator, indicatorStyle]}
        />
      ) : null}
      {IS_ANDROID ? (
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-0 left-0 h-[3px] rounded-t-full bg-brand"
          style={indicatorStyle}
        />
      ) : null}
      {tabs.map((tab) => {
        const selected = tab.value === value;
        const trigger = (
          <AnimatedPressable
            accessibilityRole={IS_ANDROID ? "tab" : "button"}
            accessibilityLabel={tab.accessibilityLabel ?? tab.label}
            accessibilityState={{ selected }}
            onPress={() => {
              hapticSelection();
              onChange(tab.value);
            }}
            className={cn(
              "relative h-11 min-w-20 flex-row items-center justify-center gap-1.5",
              IS_IOS ? "px-5" : "px-4",
              IS_ANDROID && "h-12 overflow-hidden rounded-full",
            )}
          >
            <Text
              className={cn("text-sm font-bold", selected ? "text-brand" : "text-text-muted")}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined ? (
              <Text
                className={cn(
                  "text-xs font-extrabold",
                  selected ? "text-brand" : "text-text-light",
                )}
              >
                {tab.count}
              </Text>
            ) : null}
            {selected && !IS_IOS && !IS_ANDROID ? (
              <View className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
            ) : null}
          </AnimatedPressable>
        );

        return (
          <View
            key={String(tab.value)}
            onLayout={(event) => {
              const { width, x } = event.nativeEvent.layout;
              tabLayoutsRef.current.set(tab.value, { width, x });
              if (selected) {
                scrollToActiveTab(false);
                if (IS_IOS || IS_ANDROID) moveIndicator(false);
              }
            }}
          >
            {tab.guideTargetId ? (
              <GuideTarget
                attachedTooltip={false}
                borderRadius={999}
                id={tab.guideTargetId}
                onGuideActivate={() => onChange(tab.value)}
                portalHighlight
                tooltipPlacementOverride="bottom"
              >
                {trigger}
              </GuideTarget>
            ) : (
              trigger
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View className={cn("h-11 android:h-12", className)} onLayout={handleViewportLayout}>
      {IS_IOS ? (
        <View
          className={cn(
            "h-full overflow-hidden rounded-full",
            !HAS_LIQUID_GLASS && "border border-border-subtle bg-card-bg shadow-sm",
          )}
          style={[
            styles.track,
            align === "right" ? styles.trackEnd : styles.trackStart,
            // Hidden until measured so the track doesn't flash at full width first.
            tabsWidth === null
              ? styles.trackMeasuring
              : { width: tabsWidth + TRACK_BORDER_WIDTH * 2 },
          ]}
        >
          {HAS_LIQUID_GLASS && tabsWidth !== null ? (
            <AnimatedGlassView
              pointerEvents="none"
              style={TRACK_GLASS_STYLE}
              animatedProps={glassProps}
            />
          ) : null}
          {scrollView}
        </View>
      ) : (
        scrollView
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: { top: TRACK_INSET, bottom: TRACK_INSET, left: 0 },
  track: { maxWidth: "100%" },
  trackStart: { alignSelf: "flex-start" },
  trackEnd: { alignSelf: "flex-end" },
  trackMeasuring: { opacity: 0 },
  rightAlignedContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
});
