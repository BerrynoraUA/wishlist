import { Icon } from "@/components/ui/icon";
import { useReducedMotion } from "@/lib/motion";
import { Gift } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** Pull distance at which the badge is fully grown; roughly where iOS fires the refresh. */
const PULL_RANGE = 80;
const BADGE_SIZE = 36;
const SPIN_MS = 800;

/**
 * The gift that rides in the gap above a list being pulled down (iOS bounces its content,
 * so the overscroll is visible there). It grows and unwraps into place as you pull, pops
 * when the refresh fires, spins a ring and wiggles while loading, and pops again on landing.
 */
export function PullRefreshIndicator({
  pull,
  refreshing,
  top,
}: {
  /** How far the content is pulled past its top edge, in points. */
  pull: SharedValue<number>;
  refreshing: boolean;
  top: number;
}) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const spin = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const loading = useSharedValue(0);
  const wasRefreshing = React.useRef(false);

  React.useEffect(() => {
    if (refreshing === wasRefreshing.current) return;
    wasRefreshing.current = refreshing;
    loading.value = withTiming(refreshing ? 1 : 0, { duration: 180 });
    if (reduceMotion) return;
    pop.value = withSequence(
      withTiming(refreshing ? 1.25 : 1.15, { duration: 120 }),
      withSpring(1, { stiffness: 420, damping: 12 }),
    );
    if (refreshing) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1);
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 140 }),
          withTiming(-1, { duration: 280 }),
          withTiming(0, { duration: 140 }),
          withTiming(0, { duration: 360 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(spin);
      wiggle.value = withTiming(0, { duration: 120 });
    }
  }, [refreshing, reduceMotion, loading, pop, spin, wiggle]);

  const containerStyle = useAnimatedStyle(() => ({
    height: Math.max(pull.value, 0),
    opacity: interpolate(pull.value, [8, 36], [0, 1], "clamp"),
  }));

  const badgeStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(pull.value / PULL_RANGE, 0), 1);
    const grow = Math.max(progress, loading.value);
    return {
      transform: [
        { scale: interpolate(grow, [0, 1], [0.4, 1]) * pop.value },
        { rotate: `${reduceMotion ? 0 : (1 - grow) * -180 + wiggle.value * 14}deg` },
      ],
    };
  });

  const ringStyle = useAnimatedStyle(() => ({
    opacity: loading.value,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="absolute inset-x-0 items-center justify-center overflow-hidden"
      style={[{ top }, containerStyle]}
    >
      <Animated.View
        className="items-center justify-center rounded-full bg-brand-alpha-12"
        style={[{ width: BADGE_SIZE, height: BADGE_SIZE }, badgeStyle]}
      >
        <Icon as={Gift} className="size-5 text-brand" strokeWidth={2.25} />
      </Animated.View>
      <View
        className="absolute items-center justify-center"
        style={{ width: BADGE_SIZE + 8, height: BADGE_SIZE + 8 }}
      >
        <Animated.View
          className="size-full rounded-full border-2 border-transparent border-t-brand"
          style={ringStyle}
        />
      </View>
    </Animated.View>
  );
}
