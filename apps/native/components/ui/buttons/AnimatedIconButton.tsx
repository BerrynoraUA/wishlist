import { ReactElement, useState } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import {
  animatedButtonClassName,
  animatedButtonDisabledClassName,
  animatedButtonTextClassName,
} from "@/components/ui/buttons/button-styles";

export interface AnimatedIconButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const DURATION = 300;

export const AnimatedIconButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: AnimatedIconButtonProps) => {
  const transition = useSharedValue(0);
  const previousTransition = useSharedValue(0);
  const isActive = useSharedValue(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [iconX, setIconX] = useState(0);

  const isIconMovingBack = useDerivedValue(() => {
    const value = transition.value < previousTransition.value ? 1 : 0;
    previousTransition.value = transition.value;

    return value;
  });

  const animatedIconContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(transition.value, [0, 1], [0, containerWidth / 2 - iconX]),
      },
      { scaleX: isIconMovingBack.value ? -1 : 1 },
    ],
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0]),
  }));

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        busy: isLoading,
        disabled: isDisabled || isLoading,
      }}
      disabled={isDisabled || isLoading}
      hitSlop={16}
      onPress={onPress}
      onPressIn={() => {
        isActive.value = true;
        transition.value = withTiming(1, { duration: DURATION }, () => {
          if (!isActive.value) {
            transition.value = withTiming(0, {
              duration: DURATION,
            });
          }
        });
      }}
      onPressOut={() => {
        if (transition.value === 1) {
          transition.value = withTiming(0, { duration: DURATION });
        }
        isActive.value = false;
      }}
    >
      {({ pressed }) => (
        <View
          onLayout={({ nativeEvent }) => setContainerWidth(nativeEvent.layout.width)}
          className={cn(
            animatedButtonClassName,
            "relative overflow-hidden",
            isDisabled && animatedButtonDisabledClassName,
          )}
        >
          <Animated.View
            onLayout={({ nativeEvent }) => setIconX(nativeEvent.layout.x)}
            style={animatedIconContainerStyle}
          >
            {Icon}
          </Animated.View>
          <Animated.Text
            numberOfLines={1}
            className={animatedButtonTextClassName}
            style={animatedTitleStyle}
          >
            {title}
          </Animated.Text>
          <View
            pointerEvents="none"
            className={cn("absolute inset-0 rounded-md", pressed && "bg-primary/20")}
          />
        </View>
      )}
    </AnimatedPressable>
  );
};
