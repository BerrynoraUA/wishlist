import { motionDuration, motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** Gap between neighbouring fields, so the shimmer and the fill ripple down the form. */
const AUTOFILL_STAGGER_MS = 90;
const SHIMMER_SWEEP_MS = 1200;
const HIGHLIGHT_FADE_MS = 900;
const TYPEWRITER_TOTAL_MS = 450;

/**
 * Wraps a form field the product-link scraper can fill.
 *
 * While `loading`, a brand-tinted shimmer sweeps across the field (skeleton-loader style),
 * offset by `order` so neighbouring fields read as one wave. Each new non-zero `fillId`
 * plays the arrival: a small press-and-settle pop plus a brand highlight that fades out,
 * the way browser autofill marks the fields it just wrote.
 */
export function AutofillField({
  loading,
  fillId,
  order,
  radiusClassName = "rounded-md",
  className,
  children,
}: {
  loading: boolean;
  /** Changes every time the field receives scraped data; `0` means it has not. */
  fillId: number;
  /** Position in the form, used to stagger the shimmer and the fill. */
  order: number;
  /** Must match the wrapped field's corner radius so the overlays line up. */
  radiusClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const sweep = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);
  const highlight = useSharedValue(0);
  const scale = useSharedValue(1);
  const delay = order * AUTOFILL_STAGGER_MS;

  React.useEffect(() => {
    if (!loading || reduceMotion) {
      shimmerOpacity.value = withTiming(0, { duration: motionDuration.fast });
      cancelAnimation(sweep);
      return;
    }

    sweep.value = 0;
    shimmerOpacity.value = withTiming(1, { duration: motionDuration.normal });
    sweep.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: SHIMMER_SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [delay, loading, reduceMotion, shimmerOpacity, sweep]);

  React.useEffect(() => {
    if (!fillId) return;

    highlight.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: motionDuration.fast }),
        withTiming(0, { duration: HIGHLIGHT_FADE_MS, easing: Easing.out(Easing.quad) }),
      ),
    );
    if (!reduceMotion) {
      scale.value = withDelay(
        delay,
        withSequence(withTiming(0.97, { duration: 90 }), withSpring(1, motionSpring.press)),
      );
    }
  }, [fillId]);

  const bandWidth = width * 0.6;
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
    transform: [{ translateX: -bandWidth + sweep.value * (width + bandWidth) }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.value }));

  return (
    <Animated.View
      className={className}
      style={containerStyle}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      {children}
      <View
        pointerEvents="none"
        className={cn("absolute inset-0 overflow-hidden", radiusClassName)}
      >
        <Animated.View
          className="absolute inset-y-0 start-0 bg-linear-90 from-transparent via-brand/20 to-transparent"
          style={[shimmerStyle, { width: bandWidth }]}
        />
      </View>
      <Animated.View
        pointerEvents="none"
        className={cn("absolute inset-0 border-2 border-brand bg-brand/10", radiusClassName)}
        style={highlightStyle}
      />
    </Animated.View>
  );
}

/**
 * Types `text` out character by character each time `runId` changes to a new non-zero value,
 * after the same stagger `AutofillField` uses for `order`. Returns the partial text while
 * typing and `null` otherwise — including as soon as `text` stops matching what is being
 * typed, so a user edit mid-animation is never overwritten.
 */
export function useTypewriter(text: string, runId: number, order: number) {
  const reduceMotion = useReducedMotion();
  const [typing, setTyping] = React.useState<{ target: string; typed: string } | null>(null);

  React.useEffect(() => {
    if (!runId || reduceMotion || !text) return;

    const target = text;
    const characters = Array.from(target);
    const stepMs = Math.max(12, TYPEWRITER_TOTAL_MS / characters.length);
    let count = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    setTyping({ target, typed: "" });
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        count += 1;
        if (count >= characters.length) {
          clearInterval(intervalId);
          setTyping(null);
          return;
        }
        setTyping({ target, typed: characters.slice(0, count).join("") });
      }, stepMs);
    }, order * AUTOFILL_STAGGER_MS);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      setTyping(null);
    };
  }, [runId]);

  return typing && typing.target === text ? typing.typed : null;
}
