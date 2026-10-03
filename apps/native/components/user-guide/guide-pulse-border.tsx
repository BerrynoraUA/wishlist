import { useReducedMotion } from "@/lib/motion";
import * as React from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function GuidePulseBorder({
  borderRadius,
  outset = 5,
}: {
  borderRadius: number;
  outset?: number;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    cancelAnimation(pulse);
    if (reduceMotion) {
      pulse.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 750 }), withTiming(0, { duration: 750 })),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute border-2 border-brand"
      style={[
        {
          top: -outset,
          right: -outset,
          bottom: -outset,
          left: -outset,
          borderRadius: borderRadius + outset,
        },
        animatedStyle,
      ]}
    />
  );
}
