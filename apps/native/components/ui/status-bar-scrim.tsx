import { motionDuration, useReducedMotion } from "@/lib/motion";
import * as React from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Keeps scrolled content from running under the transparent status bar, where it hides the
 * icons on light photos and collides with them on text.
 */
export function StatusBarScrim({ visible = true }: { visible?: boolean }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(visible ? 1 : 0);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  React.useEffect(() => {
    opacity.set(withTiming(visible ? 1 : 0, { duration: reduceMotion ? 0 : motionDuration.fast }));
  }, [opacity, reduceMotion, visible]);

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-x-0 top-0 z-40 bg-bg"
      style={[{ height: insets.top }, style]}
    />
  );
}
