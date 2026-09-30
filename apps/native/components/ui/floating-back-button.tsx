import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { GLASS_CAPSULE_STYLE, HAS_LIQUID_GLASS } from "@/components/ui/liquid-glass";
import { useHideBackButton } from "@/hooks/use-hide-back-button";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { SHOWCASE_ENABLED } from "@/lib/showcase/showcase-control";
import { cn } from "@/lib/utils";
import { GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import * as React from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FloatingBackButtonProps = {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

const TAB_BAR_GAP = 12;
const ANDROID_TAB_BAR_TOP_CLEARANCE = 18;
const MIN_BOTTOM_INSET = 8;
/** Roughly the push transition, so the glass lands as the screen settles. */
const MATERIALIZE_DELAY = 300;

/**
 * Shared floating "back" button used on detail screens.
 *
 * Lives at the bottom-left of the screen and computes a consistent bottom offset
 * across platforms. Both the native iOS tab bar and the custom Android tab bar
 * overlay screen content, so the button is lifted above their full height.
 *
 * Centralizing this here keeps placement identical on every detail page and avoids
 * the per-page magic numbers that previously drifted out of sync.
 */
export function FloatingBackButton({
  onPress,
  accessibilityLabel,
  className,
}: FloatingBackButtonProps) {
  const t = useGT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hidden] = useHideBackButton();
  const reduceMotion = useReducedMotion();
  const [materialized, setMaterialized] = React.useState(!HAS_LIQUID_GLASS);
  const iconOpacity = useSharedValue(HAS_LIQUID_GLASS ? 0 : 1);
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  // iOS 26: the glass materializes once the screen has come in, like a system bar button,
  // instead of arriving already drawn.
  React.useEffect(() => {
    if (!HAS_LIQUID_GLASS) return;
    const timeout = setTimeout(() => {
      setMaterialized(true);
      iconOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : motionDuration.normal });
    }, MATERIALIZE_DELAY);
    return () => clearTimeout(timeout);
  }, [iconOpacity, reduceMotion]);

  // Store screenshots have no navigation to demonstrate, and the button would sit on
  // top of the content they are selling.
  if (SHOWCASE_ENABLED || hidden) return null;

  const tabBarTopClearance = process.env.EXPO_OS === "android" ? ANDROID_TAB_BAR_TOP_CLEARANCE : 0;
  const bottom =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) +
    NAV_TAB_BAR_HEIGHT +
    tabBarTopClearance +
    TAB_BAR_GAP;

  const label = accessibilityLabel ?? t("Back");
  const handlePress = onPress ?? (() => router.back());

  if (HAS_LIQUID_GLASS) {
    return (
      <View className={cn("absolute start-3 z-50", className)} style={{ bottom }}>
        <GlassView
          isInteractive
          glassEffectStyle={{ style: materialized ? "regular" : "none", animate: !reduceMotion }}
          style={GLASS_CAPSULE_STYLE}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={handlePress}
            className="size-14 items-center justify-center"
          >
            <Animated.View style={iconStyle}>
              <Icon as={ChevronLeft} className="size-7 text-text" />
            </Animated.View>
          </Pressable>
        </GlassView>
      </View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      className={cn(
        "absolute start-3 z-50 size-14 items-center justify-center rounded-full border border-glass-border bg-glass-bg shadow-lg",
        process.env.EXPO_OS === "android" &&
          "overflow-hidden border-transparent bg-brand-lighter shadow-md",
        className,
      )}
      style={{ bottom }}
    >
      <Icon
        as={process.env.EXPO_OS === "android" ? ArrowLeft : ChevronLeft}
        className="size-7 text-text android:size-6 android:text-brand"
      />
    </AnimatedPressable>
  );
}
