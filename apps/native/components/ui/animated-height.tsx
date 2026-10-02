import { useReducedMotion } from "@/lib/motion";
import * as React from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DURATION_MS = 280;

/**
 * Animates its own height to whatever its content measures, so expanding or collapsing
 * something inside (a clamped description, a swapped-in image) glides instead of jumping.
 *
 * The content first lays out in the normal flow, so the initial size is right on the very
 * first frame and nothing animates on mount. After that it is measured off-flow and the frame
 * around it follows with a timing animation.
 */
export function AnimatedHeight({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const height = useSharedValue(-1);
  const [measured, setMeasured] = React.useState(false);

  function handleLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.height;
    if (!measured || reduceMotion) {
      height.value = next;
      if (!measured) setMeasured(true);
      return;
    }
    if (next === height.value) return;
    height.value = withTiming(next, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
  }

  const frameStyle = useAnimatedStyle(() =>
    height.value < 0 ? {} : { height: height.value, overflow: "hidden" },
  );

  return (
    <Animated.View style={measured ? frameStyle : undefined}>
      <View
        onLayout={handleLayout}
        className={className}
        style={measured ? { position: "absolute", top: 0, left: 0, right: 0 } : undefined}
      >
        {children}
      </View>
    </Animated.View>
  );
}
