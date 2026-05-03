import { ReactElement, useEffect } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import {
  animatedButtonClassName,
  animatedButtonDisabledClassName,
  animatedButtonTextClassName,
} from "@/components/ui/buttons/button-styles";

export interface BouncingButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const BACKGROUND_TRANSITION_DURATION = 300;
const BOUNCE_TRANSITION_DELAY = 3000;
const BOUNCE_TRANSITION_DURATION = 300;

export const BouncingButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: BouncingButtonProps) => {
  const bounceTransition = useSharedValue(0);
  const pressTransition = useSharedValue(0);

  useEffect(() => {
    if (isDisabled || isLoading) {
      cancelAnimation(bounceTransition);
      bounceTransition.value = 0;
      return;
    }

    bounceTransition.value = withRepeat(
      withDelay(
        BOUNCE_TRANSITION_DELAY,
        withSequence(
          withTiming(1, { duration: BOUNCE_TRANSITION_DURATION }),
          withTiming(0, { duration: BOUNCE_TRANSITION_DURATION }),
          withTiming(1, { duration: BOUNCE_TRANSITION_DURATION }),
          withTiming(0, { duration: BOUNCE_TRANSITION_DURATION }),
        ),
      ),
      -1,
    );

    return () => {
      cancelAnimation(bounceTransition);
    };
  }, [bounceTransition, isDisabled, isLoading]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressTransition.value, [0, 1], [1, 0.9]),
    transform: [
      {
        scale: interpolate(bounceTransition.value, [0, 1], [1, 1.1]),
      },
    ],
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
        pressTransition.value = withTiming(1, { duration: BACKGROUND_TRANSITION_DURATION });
      }}
      onPressOut={() => {
        pressTransition.value = withTiming(0, { duration: BACKGROUND_TRANSITION_DURATION });
      }}
    >
      {({ pressed }) => (
        <Animated.View
          className={cn(
            animatedButtonClassName,
            "relative overflow-hidden",
            isDisabled && animatedButtonDisabledClassName,
          )}
          style={animatedContainerStyle}
        >
          {isLoading ? (
            <ActivityIndicator colorClassName="accent-primary-foreground" size="small" />
          ) : (
            <>
              {Icon}
              <Text numberOfLines={1} className={animatedButtonTextClassName}>
                {title}
              </Text>
            </>
          )}
          <View
            pointerEvents="none"
            className={cn("absolute inset-0 rounded-md", pressed && "bg-primary/20")}
          />
        </Animated.View>
      )}
    </AnimatedPressable>
  );
};
