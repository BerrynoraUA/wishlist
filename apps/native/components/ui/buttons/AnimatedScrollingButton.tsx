import { ReactElement, useEffect } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import {
  animatedButtonClassName,
  animatedButtonDisabledClassName,
  animatedButtonTextClassName,
} from "@/components/ui/buttons/button-styles";

export interface AnimatedScrollingButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  currentStep: number;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  steps: {
    Icon?: ReactElement;
    title: string;
  }[];
}

const BACKGROUND_TRANSITION_DURATION = 300;
const HEIGHT = 40;
const SCROLL_TRANSITION_DURATION = 300;

export const AnimatedScrollingButton = ({
  accessibilityHint,
  accessibilityLabel,
  currentStep,
  isDisabled = false,
  isLoading = false,
  onPress,
  steps,
}: AnimatedScrollingButtonProps) => {
  const scrollTransition = useSharedValue(0);
  const backgroundTransition = useSharedValue(0);
  const isActive = useSharedValue(false);

  useEffect(() => {
    scrollTransition.value = withTiming(currentStep, {
      duration: SCROLL_TRANSITION_DURATION,
    });

    return () => {
      cancelAnimation(scrollTransition);
    };
  }, [currentStep, scrollTransition.value, scrollTransition]);

  const animatedScrollingContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backgroundTransition.value, [0, 1], [1, 0.9]),
    transform: [
      {
        translateY: interpolate(
          scrollTransition.value,
          [0, steps.length - 1],
          [-HEIGHT * (steps.length - 1), 0],
        ),
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        busy: isLoading || currentStep > 0,
        disabled: isDisabled || isLoading,
      }}
      disabled={isDisabled || isLoading || currentStep > 0}
      hitSlop={16}
      onPress={onPress}
      onPressIn={() => {
        isActive.value = true;
        backgroundTransition.value = withTiming(
          1,
          { duration: BACKGROUND_TRANSITION_DURATION },
          () => {
            if (!isActive.value) {
              backgroundTransition.value = withTiming(0, {
                duration: BACKGROUND_TRANSITION_DURATION,
              });
            }
          },
        );
      }}
      onPressOut={() => {
        if (backgroundTransition.value === 1) {
          backgroundTransition.value = withTiming(0, {
            duration: BACKGROUND_TRANSITION_DURATION,
          });
        }
        isActive.value = false;
      }}
    >
      {({ pressed }) => (
        <View
          className={cn(
            "relative h-10 overflow-hidden rounded-md bg-primary shadow-sm shadow-black/5 sm:h-9",
            isDisabled && animatedButtonDisabledClassName,
          )}
        >
          <Animated.View style={animatedScrollingContainerStyle}>
            {steps.reverse().map((step) => (
              <View key={step.title} className={animatedButtonClassName}>
                {step.Icon}
                <Text numberOfLines={1} className={animatedButtonTextClassName}>
                  {step.title}
                </Text>
              </View>
            ))}
          </Animated.View>
          <View
            pointerEvents="none"
            className={cn("absolute inset-0 rounded-md", pressed && "bg-primary/20")}
          />
        </View>
      )}
    </AnimatedPressable>
  );
};
