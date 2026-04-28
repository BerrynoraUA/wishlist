import { motionDuration, motionPress, motionSpring, useReducedMotion } from "@/lib/motion";
import * as React from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableProps = React.ComponentProps<typeof Pressable>;
type PressEvent = Parameters<NonNullable<PressableProps["onPressIn"]>>[0];

type UseAnimatedPressFeedbackOptions = {
  disabled?: boolean | null;
  onPressIn?: PressableProps["onPressIn"];
  onPressOut?: PressableProps["onPressOut"];
  pressedOpacity?: number;
  pressedScale?: number;
};

type AnimatedPressableProps = React.ComponentProps<typeof Pressable> & {
  pressedOpacity?: number;
  pressedScale?: number;
} & React.RefAttributes<React.ComponentRef<typeof Pressable>>;

function useAnimatedPressFeedback({
  disabled,
  onPressIn,
  onPressOut,
  pressedOpacity = motionPress.opacity,
  pressedScale = motionPress.scale,
}: UseAnimatedPressFeedbackOptions) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn(event: PressEvent) {
    if (!disabled) {
      scale.value = reduceMotion ? 1 : withSpring(pressedScale, motionSpring.press);
      opacity.value = withTiming(pressedOpacity, { duration: motionDuration.fast });
    }

    onPressIn?.(event);
  }

  function handlePressOut(event: Parameters<NonNullable<typeof onPressOut>>[0]) {
    scale.value = reduceMotion ? 1 : withSpring(1, motionSpring.press);
    opacity.value = withTiming(1, { duration: motionDuration.fast });

    onPressOut?.(event);
  }

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
  };
}

function AnimatedPressable({
  ref,
  onPressIn,
  onPressOut,
  pressedOpacity = motionPress.opacity,
  pressedScale = motionPress.scale,
  style,
  ...props
}: AnimatedPressableProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = useAnimatedPressFeedback({
    disabled: props.disabled,
    onPressIn,
    onPressOut,
    pressedOpacity,
    pressedScale,
  });

  return (
    <ReanimatedPressable
      ref={ref}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...props}
    />
  );
}

export { AnimatedPressable, useAnimatedPressFeedback };
export type { AnimatedPressableProps, UseAnimatedPressFeedbackOptions };
