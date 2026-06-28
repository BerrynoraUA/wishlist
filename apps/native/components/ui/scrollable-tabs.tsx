import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Platform, ScrollView, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

// iOS 26+ renders a sliding liquid-glass capsule behind the active tab (Telegram-style).
// Older iOS and Android keep the Material-style underline indicator.
const USE_LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

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
  className,
}: {
  tabs: ScrollableTab<T>[];
  value: T;
  onChange: (value: T) => void;
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
      if (USE_LIQUID_GLASS) moveIndicator(true);
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
    <View
      className={cn(
        USE_LIQUID_GLASS ? "bg-bg" : "border-b border-border-subtle bg-bg",
        className,
      )}
      onLayout={handleViewportLayout}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        bounces
        contentContainerClassName={USE_LIQUID_GLASS ? "px-2" : "px-1"}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {USE_LIQUID_GLASS ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", top: 6, bottom: 6, left: 0 }, indicatorStyle]}
          >
            <GlassView glassEffectStyle="regular" style={{ flex: 1, borderRadius: 999 }} />
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
                USE_LIQUID_GLASS ? "px-5" : "px-4",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-bold",
                  selected
                    ? USE_LIQUID_GLASS
                      ? "text-text"
                      : "text-brand"
                    : "text-text-muted",
                )}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined ? (
                <Text
                  className={cn(
                    "text-xs font-extrabold",
                    selected
                      ? USE_LIQUID_GLASS
                        ? "text-text"
                        : "text-brand"
                      : "text-text-light",
                  )}
                >
                  {tab.count}
                </Text>
              ) : null}
              {selected && !USE_LIQUID_GLASS ? (
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
                  if (USE_LIQUID_GLASS) moveIndicator(false);
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
