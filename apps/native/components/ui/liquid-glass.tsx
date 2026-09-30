import { motionSpring, useReducedMotion } from "@/lib/motion";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as React from "react";
import { Pressable, StyleSheet } from "react-native";
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
/** Clears a pill's own border, fill and shadow so the glass behind it shows. */
export const GLASS_PILL_CLASS = "border-transparent bg-transparent shadow-none dark:bg-transparent";

const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, GLASS_CAPSULE_STYLE];

const GLASS_BUTTON_SIZE = 44;
export const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

/**
 * 0 → 1 as `visible` turns on, on a slightly bouncy spring (the wobble is the "liquid").
 * It overshoots, so clamp it before using it as a size.
 */
export function useGlassReveal(visible: boolean, reduceMotion: boolean) {
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
  accessibilityState,
  onPress,
  children,
}: {
  visible: boolean;
  progress: SharedValue<number>;
  accessibilityLabel: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>["accessibilityState"];
  onPress: () => void;
  children: React.ReactNode;
}) {
  const contentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
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
 * Glass behind a filter-panel pill that draws its own shape (render it first inside the
 * pill). It materializes as the panel opens and dissolves as it closes, rather than only
 * fading with the panel: UIKit doesn't render glass correctly under partial alpha.
 */
export function PanelPillGlass({ open }: { open: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <GlassView
      pointerEvents="none"
      glassEffectStyle={{ style: open ? "regular" : "none", animate: !reduceMotion }}
      style={PILL_GLASS_STYLE}
    />
  );
}

/**
 * A 44pt button inside a shared glass capsule that opens up when `visible` turns on and
 * closes to nothing when it turns off, so the capsule grows and shrinks around it.
 */
export function GlassCapsuleSlot({
  visible,
  accessibilityLabel,
  accessibilityState,
  onPress,
  children,
}: {
  visible: boolean;
  accessibilityLabel: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>["accessibilityState"];
  onPress: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useGlassReveal(visible, reduceMotion);
  const slotStyle = useAnimatedStyle(() => ({
    width: GLASS_BUTTON_SIZE * Math.max(0, progress.value),
  }));

  return (
    <Animated.View className="overflow-hidden" style={slotStyle}>
      <GlassIconButton
        visible={visible}
        progress={progress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
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
  accessibilityState,
  onPress,
  children,
}: {
  visible: boolean;
  placement?: "before" | "after";
  gap?: number;
  accessibilityLabel: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>["accessibilityState"];
  onPress: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useGlassReveal(visible, reduceMotion);
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
        accessibilityState={accessibilityState}
        onPress={onPress}
      >
        {children}
      </GlassIconButton>
    </AnimatedGlassView>
  );
}
