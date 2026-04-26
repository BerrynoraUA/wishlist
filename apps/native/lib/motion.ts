import * as React from "react";
import { AccessibilityInfo } from "react-native";

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
