import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

// iOS renders a sliding Telegram-style capsule behind the active tab; on iOS 26+ the capsule
// is layered with a real liquid-glass sheen.
const IS_IOS = Platform.OS === "ios";
const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
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
}: {
  tabs: ScrollableTab<T>[];
  value: T;
  onChange: (value: T) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const scrollRef = React.useRef<ScrollView>(null);
  const tabLayoutsRef = React.useRef(new Map<T, { width: number; x: number }>());
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const reduceMotion = useReducedMotion();

  // Drives the liquid-glass capsule on iOS 26+. Unused on Android / older iOS.
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorReady = useSharedValue(0);

  const moveIndicator = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      if (!layout) return;

      // Snap into place on first measure, then spring between tabs afterwards.
      // (mirrors the Material underline; only the iOS capsule reads these values)
      if (animated && indicatorReady.value === 1 && !reduceMotion) {
        indicatorX.value = withSpring(layout.x, motionSpring.navPill);
        indicatorWidth.value = withSpring(layout.width, motionSpring.navPill);
      } else {
        indicatorX.value = layout.x;
        indicatorWidth.value = layout.width;
      }
      indicatorReady.value = 1;
    },
    [value, reduceMotion, indicatorX, indicatorWidth, indicatorReady],
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
      scrollToActiveTab(true);
      if (IS_IOS) moveIndicator(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollToActiveTab, moveIndicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorReady.value,
  }));

  function handleViewportLayout(event: LayoutChangeEvent) {
    setViewportWidth(event.nativeEvent.layout.width);
  }

  return (
    <View className={cn("bg-bg", className)} onLayout={handleViewportLayout}>
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
                top: 4,
                bottom: 4,
                left: 0,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
              },
              indicatorStyle,
            ]}
          >
            {HAS_LIQUID_GLASS ? (
              <GlassView pointerEvents="none" style={INDICATOR_GLASS_STYLE} />
            ) : null}
          </Animated.View>
        ) : null}
        {tabs.map((tab) => {
          const selected = tab.value === value;
          const trigger = (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={tab.accessibilityLabel ?? tab.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(tab.value)}
              className={cn(
                "relative h-11 min-w-20 flex-row items-center justify-center gap-1.5",
                IS_IOS ? "px-5" : "px-4",
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
              {selected && !IS_IOS ? (
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
                  if (IS_IOS) moveIndicator(false);
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
