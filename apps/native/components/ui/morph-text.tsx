import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as React from "react";
import type { ViewProps } from "react-native";
import Animated, {
  Easing,
  LayoutAnimationConfig,
  LinearTransition,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";

/** Ease-out with no overshoot: things settle into place instead of bouncing there. */
export const MORPH_EASING = Easing.bezier(0.2, 0, 0, 1);
const MORPH_DURATION = 320;

/**
 * The transition every view around a `MorphText` should share as its `layout` transition,
 * so the words, the containers they resize, and the siblings they push all glide in step.
 */
export const morphLayoutTransition = LinearTransition.duration(MORPH_DURATION).easing(MORPH_EASING);

/** Lets the outgoing words start leaving before the first new one rises. */
const WORD_ENTER_DELAY = 60;
const WORD_STAGGER = 35;

function wordEntering(delay: number): EntryExitAnimationFunction {
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 6 }, { scale: 0.94 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 220 })),
        transform: [
          {
            translateY: withDelay(
              delay,
              withTiming(0, { duration: MORPH_DURATION, easing: MORPH_EASING }),
            ),
          },
          {
            scale: withDelay(
              delay,
              withTiming(1, { duration: MORPH_DURATION, easing: MORPH_EASING }),
            ),
          },
        ],
      },
    };
  };
}

const wordExiting: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 140 }),
      transform: [
        { translateY: withTiming(-6, { duration: 180 }) },
        { scale: withTiming(0.94, { duration: 180 }) },
      ],
    },
  };
};

/**
 * Words keyed by their text (plus which occurrence it is), so a word both labels share —
 * "have an account?" in "Don't have an account?" → "Already have an account?" — stays and
 * slides into its new place while only the words that changed leave and arrive.
 */
function toWords(text: string) {
  const seen = new Map<string, number>();
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const occurrence = seen.get(word) ?? 0;
      seen.set(word, occurrence + 1);
      return { word, key: `${word}#${occurrence}` };
    });
}

/**
 * Text that morphs into its next value word by word: changed words fade up and away while
 * the new ones rise in on a stagger, and shared words glide to their new spot. Words, not letters,
 * so scripts that join their letters (Arabic, Devanagari) keep shaping correctly; text with
 * no spaces (Chinese, Japanese, Thai) morphs as one piece.
 */
export function MorphText({
  text,
  className,
  containerClassName,
  wordGap = 4,
  style,
  ...props
}: ViewProps & {
  text: string;
  /** Classes for each word's `Text`. */
  className?: string;
  containerClassName?: string;
  /** Space between words, roughly a space's width at the text size. */
  wordGap?: number;
}) {
  const words = React.useMemo(() => toWords(text), [text]);

  return (
    // Words already on screen when it mounts just appear; only later changes animate.
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        className={cn("shrink flex-row flex-wrap justify-center", containerClassName)}
        layout={morphLayoutTransition}
        style={[{ columnGap: wordGap }, style]}
        {...props}
      >
        {words.map(({ word, key }, index) => (
          <Animated.View
            key={key}
            entering={wordEntering(WORD_ENTER_DELAY + index * WORD_STAGGER)}
            exiting={wordExiting}
            layout={morphLayoutTransition}
            style={{ maxWidth: "100%" }}
          >
            <Text className={className}>{word}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}
