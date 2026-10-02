import { Input } from "@/components/ui/input";
import { motionDuration, motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { useCSSVariable } from "uniwind";

/** Gap between neighbouring fields, so the shimmer and the fill ripple down the form. */
const AUTOFILL_STAGGER_MS = 90;
const SHIMMER_SWEEP_MS = 1200;
const HIGHLIGHT_FADE_MS = 900;
const TYPEWRITER_TOTAL_MS = 450;
/** Caps re-renders on long titles: the text grows in chunks rather than a render per letter. */
const TYPEWRITER_MAX_STEPS = 24;

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
  // A shared value, so a layout pass never re-renders the field.
  const width = useSharedValue(0);
  const sweep = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);
  const highlight = useSharedValue(0);
  const scale = useSharedValue(1);
  const delay = order * AUTOFILL_STAGGER_MS;

  React.useEffect(() => {
    if (!loading || reduceMotion) {
      shimmerOpacity.set(withTiming(0, { duration: motionDuration.fast }));
      cancelAnimation(sweep);
      return;
    }

    sweep.set(0);
    shimmerOpacity.set(withTiming(1, { duration: motionDuration.normal }));
    sweep.set(
      withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: SHIMMER_SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
          -1,
          false,
        ),
      ),
    );
  }, [delay, loading, reduceMotion, shimmerOpacity, sweep]);

  React.useEffect(() => {
    if (!fillId) return;

    highlight.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: motionDuration.fast }),
          withTiming(0, { duration: HIGHLIGHT_FADE_MS, easing: Easing.out(Easing.quad) }),
        ),
      ),
    );
    if (!reduceMotion) {
      scale.set(
        withDelay(
          delay,
          withSequence(withTiming(0.97, { duration: 90 }), withSpring(1, motionSpring.press)),
        ),
      );
    }
  }, [fillId]);

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const shimmerStyle = useAnimatedStyle(() => {
    const bandWidth = width.get() * 0.6;
    return {
      width: bandWidth,
      opacity: shimmerOpacity.get(),
      transform: [{ translateX: -bandWidth + sweep.get() * (width.get() + bandWidth) }],
    };
  });
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.get() }));

  return (
    <Animated.View
      className={className}
      style={containerStyle}
      onLayout={({ nativeEvent }) => {
        width.set(nativeEvent.layout.width);
      }}
    >
      {children}
      <View
        pointerEvents="none"
        className={cn("absolute inset-0 overflow-hidden", radiusClassName)}
      >
        <Animated.View
          className="absolute inset-y-0 start-0 bg-linear-90 from-transparent via-brand/20 to-transparent"
          style={shimmerStyle}
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
 * An `Input` that types a scraped value out each time `runId` changes to a new non-zero value,
 * after the same stagger `AutofillField` uses for `order`. The typing state lives here rather
 * than in the form, so each step re-renders this one input instead of the whole sheet; and it
 * gives way as soon as `value` stops matching what is being typed, so a user edit mid-animation
 * is never overwritten.
 */
export function TypewriterInput({
  value,
  runId,
  order,
  ...props
}: React.ComponentProps<typeof Input> & { value: string; runId: number; order: number }) {
  const reduceMotion = useReducedMotion();
  const [typing, setTyping] = React.useState<{ target: string; typed: string } | null>(null);

  React.useEffect(() => {
    if (!runId || reduceMotion || !value) return;

    const target = value;
    const characters = Array.from(target);
    const steps = Math.min(characters.length, TYPEWRITER_MAX_STEPS);
    let step = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    setTyping({ target, typed: "" });
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        step += 1;
        if (step >= steps) {
          clearInterval(intervalId);
          setTyping(null);
          return;
        }
        const count = Math.round((step / steps) * characters.length);
        setTyping({ target, typed: characters.slice(0, count).join("") });
      }, TYPEWRITER_TOTAL_MS / steps);
    }, order * AUTOFILL_STAGGER_MS);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      setTyping(null);
    };
  }, [runId]);

  return <Input value={typing && typing.target === value ? typing.typed : value} {...props} />;
}

/** How long the digit columns take to land, after their stagger, before the input takes over. */
const PRICE_ROLL_SETTLE_MS = 750;
const PRICE_COLUMN_STAGGER_MS = 35;
/** Digit rows are taller than the 20pt window they show through, so neighbours never peek in. */
const PRICE_ROW_HEIGHT = 28;
const PRICE_ROW_INSET = (PRICE_ROW_HEIGHT - 20) / 2;
/** Two laps of 0–9, so every column — zeros included — spins a full turn before landing. */
const PRICE_STACK = Array.from({ length: 20 }, (_, index) => String(index % 10)).join("\n");
/** Lands in ~0.5s with a ~3% overshoot, like the Wishlane loop demo's price roll. */
const PRICE_ROLL_SPRING = { duration: 500, dampingRatio: 0.75 } as const;

/**
 * Returns the price to roll in each time `runId` changes to a new non-zero value, until the
 * digits have landed; `null` otherwise — including as soon as `text` stops matching, so a
 * user edit mid-roll hands straight back to the input.
 */
function usePriceRoll(text: string, runId: number, order: number) {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = React.useState({ id: 0, target: "", done: true });

  // Start in the same render the fill lands in, so the plain value never flashes first.
  if (run.id !== runId) {
    setRun({ id: runId, target: text, done: !runId || reduceMotion || !text });
  }

  React.useEffect(() => {
    if (run.done) return;

    const columns = Array.from(run.target).filter((char) => /\d/u.test(char)).length;
    const timeoutId = setTimeout(
      () => setRun((current) => (current.id === run.id ? { ...current, done: true } : current)),
      order * AUTOFILL_STAGGER_MS + columns * PRICE_COLUMN_STAGGER_MS + PRICE_ROLL_SETTLE_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [order, run]);

  return !run.done && run.id === runId && run.target === text ? run.target : null;
}

/**
 * A price `Input` whose scraped value rolls up odometer-style each time `runId` changes to a
 * new non-zero value: every digit column spins a lap up from 0 on its own spring, staggered
 * left to right, while symbols fade in with the first. The input itself is blanked underneath
 * until the digits land.
 */
export function RollingPriceInput({
  value,
  runId,
  order,
  placeholder,
  ...props
}: React.ComponentProps<typeof Input> & { value: string; runId: number; order: number }) {
  const rolling = usePriceRoll(value, runId, order);

  return (
    <View>
      <Input
        // Blanked rather than made transparent: the class colour overrides a style colour.
        value={rolling !== null ? "" : value}
        placeholder={rolling !== null ? "" : placeholder}
        {...props}
      />
      {rolling !== null ? <RollingPrice value={rolling} order={order} /> : null}
    </View>
  );
}

function RollingPrice({ value, order }: { value: string; order: number }) {
  const delay = order * AUTOFILL_STAGGER_MS;
  const opacity = useSharedValue(0);
  let column = 0;

  React.useEffect(() => {
    // Stay blank, like the rest of the form, until this field's turn in the stagger.
    opacity.set(withDelay(delay, withTiming(1, { duration: 120 })));
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-px flex-row items-center px-3"
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from(value).map((char, index) =>
        /\d/u.test(char) ? (
          <RollingDigit
            key={index}
            digit={Number(char)}
            delay={delay + column++ * PRICE_COLUMN_STAGGER_MS}
          />
        ) : (
          <FadingSymbol key={index} char={char} delay={delay} />
        ),
      )}
    </Animated.View>
  );
}

function RollingDigit({ digit, delay }: { digit: number; delay: number }) {
  const offset = useSharedValue(0);

  React.useEffect(() => {
    offset.set(withDelay(delay, withSpring(-(10 + digit) * PRICE_ROW_HEIGHT, PRICE_ROLL_SPRING)));
  }, [delay, digit, offset]);

  const stackStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    // Sized by the landing digit so the handoff to the input's own text doesn't shift.
    <View className="h-5 overflow-hidden">
      <Text className="text-base leading-5 opacity-0">{digit}</Text>
      <Animated.View
        className="absolute inset-x-0 items-center"
        style={[{ top: -PRICE_ROW_INSET }, stackStyle]}
      >
        {/* One text node per column rather than one per digit keeps the mount cheap. */}
        <Text className="text-center text-base leading-7 text-text">{PRICE_STACK}</Text>
      </Animated.View>
    </View>
  );
}

function FadingSymbol({ char, delay }: { char: string; delay: number }) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.set(withDelay(delay, withTiming(1, { duration: 120 })));
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.Text className="text-base leading-5 text-text" style={style}>
      {char}
    </Animated.Text>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const BORDER_SPIN_MS = 1400;
const BORDER_STROKE = 2;

/**
 * Wraps a field with a border spinner while `loading`: two brand segments chase each other
 * around the field's outline, drawn in SVG so they follow the rounded corners exactly.
 * `radius` must match the wrapped field's corner radius.
 */
export function LoadingBorder({
  loading,
  radius,
  children,
}: {
  loading: boolean;
  radius: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const brand = useCSSVariable("--color-brand");
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const inset = BORDER_STROKE / 2;
  const width = Math.max(0, size.width - BORDER_STROKE);
  const height = Math.max(0, size.height - BORDER_STROKE);
  const r = Math.max(0, Math.min(radius - inset, width / 2, height / 2));
  const perimeter = 2 * (width + height) - (8 - 2 * Math.PI) * r;

  React.useEffect(() => {
    if (!loading) {
      opacity.set(withTiming(0, { duration: motionDuration.fast }));
      cancelAnimation(progress);
      return;
    }

    opacity.set(withTiming(1, { duration: motionDuration.fast }));
    progress.set(0);
    if (!reduceMotion) {
      progress.set(
        withRepeat(withTiming(1, { duration: BORDER_SPIN_MS, easing: Easing.linear }), -1, false),
      );
    }
  }, [loading, opacity, progress, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const rectProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.get() * perimeter,
  }));

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const { width: nextWidth, height: nextHeight } = nativeEvent.layout;
        if (nextWidth !== size.width || nextHeight !== size.height) {
          setSize({ width: nextWidth, height: nextHeight });
        }
      }}
    >
      {children}
      {perimeter > 0 ? (
        <Animated.View pointerEvents="none" className="absolute inset-0" style={overlayStyle}>
          <Svg width={size.width} height={size.height}>
            <AnimatedRect
              x={inset}
              y={inset}
              width={width}
              height={height}
              rx={r}
              ry={r}
              fill="none"
              stroke={typeof brand === "string" ? brand : undefined}
              strokeWidth={BORDER_STROKE}
              strokeLinecap="round"
              // Two segments, each a fifth of the outline, half a lap apart.
              strokeDasharray={[perimeter / 5, perimeter * 0.3]}
              animatedProps={rectProps}
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
