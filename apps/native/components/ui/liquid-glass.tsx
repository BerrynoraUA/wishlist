import { motionSpring, useReducedMotion } from "@/lib/motion";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Pressable } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/** iOS 26+. Everything built on the helpers below needs its own fallback elsewhere. */
export const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
export const GLASS_CAPSULE_STYLE = { borderRadius: 9999 };
/** Distance at which neighbouring glass shapes in a `GlassContainer` melt into each other. */
export const GLASS_MERGE_SPACING = 12;

const GLASS_BUTTON_SIZE = 44;
const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

/**
 * 0 → 1 as `visible` turns on, on a slightly bouncy spring (the wobble is the "liquid").
 * It overshoots, so clamp it before using it as a size.
 */
export function useGlassReveal(visible: boolean) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    progress.value = reduceMotion
      ? visible
        ? 1
        : 0
      : withSpring(visible ? 1 : 0, motionSpring.navPill);
  }, [progress, reduceMotion, visible]);

  return progress;
}

function GlassIconButton({
  visible,
  progress,
  accessibilityLabel,
  onPress,
  children,
}: {
  visible: boolean;
  progress: SharedValue<number>;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const contentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      disabled={!visible}
      onPress={onPress}
      className="size-11 items-center justify-center"
    >
      <Animated.View style={contentStyle}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * A 44pt button inside a shared glass capsule that opens up when `visible` turns on and
 * closes to nothing when it turns off, so the capsule grows and shrinks around it.
 */
export function GlassCapsuleSlot({
  visible,
  accessibilityLabel,
  onPress,
  children,
}: {
  visible: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const progress = useGlassReveal(visible);
  const slotStyle = useAnimatedStyle(() => ({
    width: GLASS_BUTTON_SIZE * Math.max(0, progress.value),
  }));

  return (
    <Animated.View className="overflow-hidden" style={slotStyle}>
      <GlassIconButton
        visible={visible}
        progress={progress}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
      >
        {children}
      </GlassIconButton>
    </Animated.View>
  );
}

/**
 * A round glass button that splits off the glass next to it when `visible` turns on, and
 * melts back into it when it turns off. Its slot grows out of nothing while UIKit
 * materializes the glass, so inside a `GlassContainer` the two read as one liquid body.
 * `placement` is which side of its neighbour it sits on; `gap` is the space it opens.
 */
export function MorphingGlassButton({
  visible,
  placement = "before",
  gap = 8,
  accessibilityLabel,
  onPress,
  children,
}: {
  visible: boolean;
  placement?: "before" | "after";
  gap?: number;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useGlassReveal(visible);
  const slotStyle = useAnimatedStyle(() => {
    const value = Math.max(0, progress.value);
    return {
      width: GLASS_BUTTON_SIZE * value,
      [placement === "before" ? "marginEnd" : "marginStart"]: gap * value,
    };
  });

  return (
    <AnimatedGlassView
      isInteractive
      glassEffectStyle={{ style: visible ? "regular" : "none", animate: !reduceMotion }}
      pointerEvents={visible ? "auto" : "none"}
      style={[GLASS_CAPSULE_STYLE, { height: GLASS_BUTTON_SIZE }, slotStyle]}
    >
      <GlassIconButton
        visible={visible}
        progress={progress}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
      >
        {children}
      </GlassIconButton>
    </AnimatedGlassView>
  );
}
