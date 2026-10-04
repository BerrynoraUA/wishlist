import { useAnimatedPressFeedback } from "@/components/ui/animated-pressable";
import { motionPress } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

const IS_ANDROID = process.env.EXPO_OS === "android";
// Same platform split as AnimatedPressable: Android shows a tint instead of dimming or shrinking.
const DEFAULT_PRESSED_OPACITY = IS_ANDROID ? 1 : motionPress.opacity;
const DEFAULT_PRESSED_SCALE = IS_ANDROID ? 1 : motionPress.scale;

type TouchTargetProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children" | "className" | "style"
> & {
  /** Space added around the control, in points. A negative margin cancels it, so layout is unchanged. */
  slop: number | { x: number; y: number };
  /** Layout of the target within its parent (flex, absolute positioning). */
  className?: string;
  /** The visible control. */
  contentClassName?: string;
  /** Applied to the visible control while pressed. */
  pressedClassName?: string;
  pressedOpacity?: number;
  pressedScale?: number;
  /** Android: tint the control while pressed, standing in for the ripple. */
  stateLayer?: boolean;
  children?: React.ReactNode;
};

/**
 * A control drawn smaller than its touch target. Unlike hitSlop, the extra area is real layout,
 * so it still receives touches where it overflows the parent and screen readers get the full
 * frame. Press feedback is drawn on the visible control only, so it looks as if the control
 * itself were pressed.
 */
function TouchTarget({
  slop,
  className,
  contentClassName,
  pressedClassName,
  pressedOpacity = DEFAULT_PRESSED_OPACITY,
  pressedScale = DEFAULT_PRESSED_SCALE,
  stateLayer = IS_ANDROID,
  onLongPress,
  onPressIn,
  onPressOut,
  children,
  ...props
}: TouchTargetProps) {
  const { animatedStyle, handleLongPress, handlePressIn, handlePressOut } =
    useAnimatedPressFeedback({
      disabled: props.disabled,
      onLongPress,
      onPressIn,
      onPressOut,
      pressedOpacity,
      pressedScale,
    });
  const x = typeof slop === "number" ? slop : slop.x;
  const y = typeof slop === "number" ? slop : slop.y;

  return (
    <Pressable
      className={className}
      style={{
        paddingHorizontal: x,
        paddingVertical: y,
        marginHorizontal: -x,
        marginVertical: -y,
      }}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {({ pressed }) => (
        <Animated.View
          className={cn(
            contentClassName,
            stateLayer && "overflow-hidden",
            pressed && pressedClassName,
          )}
          style={animatedStyle}
        >
          {children}
          {stateLayer && pressed ? (
            <View pointerEvents="none" className="absolute inset-0 bg-brand-alpha-12" />
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

export { TouchTarget };
