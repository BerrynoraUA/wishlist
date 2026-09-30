import { hapticSelection } from "@/lib/haptics";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
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

// iOS renders a sliding Telegram-style capsule behind the active tab; on iOS 26+ the capsule
// is layered with a real liquid-glass sheen.
const IS_IOS = Platform.OS === "ios";
const IS_ANDROID = Platform.OS === "android";
const MATERIAL_INDICATOR_TIMING = { duration: 220, easing: Easing.bezier(0.2, 0, 0, 1) };
const INDICATOR_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 999 }];

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
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const reduceMotion = useReducedMotion();

  // Shared geometry for the iOS capsule and the Android underline.
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorReady = useSharedValue(0);
  const indicatorStretch = useSharedValue(0);
  const indicatorTargetRef = React.useRef<number | null>(null);

  const moveIndicator = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      if (!layout) return;

      const targetX = IS_ANDROID ? layout.x + 12 : layout.x;
      const targetWidth = IS_ANDROID ? Math.max(0, layout.width - 24) : layout.width;
      // Snap on first measure. Android glides; iOS uses a liquid spring.
      if (animated && indicatorReady.value === 1 && !reduceMotion) {
        indicatorX.value = IS_ANDROID
          ? withTiming(targetX, MATERIAL_INDICATOR_TIMING)
          : withSpring(targetX, motionSpring.navPill);
        indicatorWidth.value = IS_ANDROID
          ? withTiming(targetWidth, MATERIAL_INDICATOR_TIMING)
          : withSpring(targetWidth, motionSpring.navPill);
        // Only a real move between tabs gets the droplet, not a re-measure in place.
        if (IS_IOS && indicatorTargetRef.current !== layout.x)
          indicatorStretch.value = liquidStretch();
      } else {
        indicatorX.value = targetX;
        indicatorWidth.value = targetWidth;
      }
      indicatorTargetRef.current = layout.x;
      indicatorReady.value = 1;
    },
    [value, reduceMotion, indicatorX, indicatorWidth, indicatorReady, indicatorStretch],
  );

  const scrollToActiveTab = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      if (!layout || viewportWidth === 0) return;

      scrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - (viewportWidth - layout.width) / 2),
        animated,
      });
    },
    [value, viewportWidth],
  );

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToActiveTab(!reduceMotion);
      if (IS_IOS || IS_ANDROID) moveIndicator(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollToActiveTab, moveIndicator, reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorX.value },
      ...(IS_IOS ? liquidStretchTransform(indicatorStretch.value) : []),
    ],
    width: indicatorWidth.value,
    opacity: indicatorReady.value,
  }));

  function handleViewportLayout(event: LayoutChangeEvent) {
    setViewportWidth(event.nativeEvent.layout.width);
  }

  // UIKit can drop an effect when any ancestor reaches zero alpha. Reset the effect
  // on the UI thread alongside that fade, including the indicator's initial layout.
  const glassProps = useAnimatedProps<GlassViewProps>(() => ({
    glassEffectStyle: indicatorReady.value * (opacity?.value ?? 1) > 0.01 ? "regular" : "none",
  }));

  return (
    <View className={cn("h-11 android:h-12", className)} onLayout={handleViewportLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        bounces
        contentContainerClassName={IS_IOS ? "px-2" : "px-1"}
        contentContainerStyle={align === "right" ? styles.rightAlignedContent : undefined}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {IS_IOS ? (
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full border border-border-subtle bg-bg-elevated"
            style={[
              {
                top: 0,
                bottom: 0,
                left: 0,
              },
              indicatorStyle,
            ]}
          >
            {HAS_LIQUID_GLASS ? (
              <AnimatedGlassView
                pointerEvents="none"
                style={INDICATOR_GLASS_STYLE}
                animatedProps={glassProps}
              />
            ) : null}
          </Animated.View>
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
                IS_ANDROID && "h-12 overflow-hidden rounded-t-xl",
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
                  id={tab.guideTargetId}
                  onGuideActivate={() => onChange(tab.value)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  rightAlignedContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
});
