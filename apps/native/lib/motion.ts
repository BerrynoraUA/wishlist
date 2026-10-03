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
  return React.useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

let reducedMotionEnabled = false;
const reducedMotionListeners = new Set<() => void>();
let reducedMotionSubscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
let reducedMotionQueryCleanup: (() => void) | null = null;

function getReducedMotion() {
  return reducedMotionEnabled;
}

function updateReducedMotion(enabled: boolean) {
  if (reducedMotionEnabled === enabled) return;
  reducedMotionEnabled = enabled;
  reducedMotionListeners.forEach((listener) => listener());
}

function subscribeReducedMotion(listener: () => void) {
  reducedMotionListeners.add(listener);
  if (!reducedMotionSubscription) {
    let active = true;
    reducedMotionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      updateReducedMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) updateReducedMotion(enabled);
    });
    reducedMotionQueryCleanup = () => {
      active = false;
    };
  }

  return () => {
    reducedMotionListeners.delete(listener);
    if (reducedMotionListeners.size === 0) {
      reducedMotionQueryCleanup?.();
      reducedMotionSubscription?.remove();
      reducedMotionSubscription = null;
    }
  };
}
