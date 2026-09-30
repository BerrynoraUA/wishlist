import * as React from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { withSequence, withSpring, withTiming } from "react-native-reanimated";

export const motionDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
  loading: 1500,
} as const;

export const motionSpring = {
  navPill: {
    stiffness: 500,
    damping: 24,
    mass: 1,
  },
  press: {
    stiffness: 460,
    damping: 16,
    mass: 0.75,
  },
} as const;

export const motionPress = {
  scale: 0.95,
  opacity: 0.9,
} as const;

/**
 * How a pushed detail screen comes in. iOS keeps the system push, so the native swipe back
 * and the zoom transition (`ZoomLink`) work — any custom animation would replace both.
 */
export const detailScreenAnimation = Platform.OS === "ios" ? "default" : "fade";

/**
 * The droplet a sliding selection indicator makes: it swells along its path and flattens a
 * little, then springs back as it lands. Assign `liquidStretch()` to a shared value each time
 * the indicator moves, and apply it with `liquidStretchTransform`.
 */
export function liquidStretch() {
  return withSequence(withTiming(1, { duration: 110 }), withSpring(0, motionSpring.navPill));
}

export function liquidStretchTransform(stretch: number) {
  "worklet";
  return [{ scaleX: 1 + 0.14 * stretch }, { scaleY: 1 - 0.1 * stretch }];
}

export function useReducedMotion() {
  const [reducedMotionEnabled, setReducedMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotionEnabled(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotionEnabled,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotionEnabled;
}
