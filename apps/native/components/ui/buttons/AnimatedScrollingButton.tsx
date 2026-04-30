import { ReactElement, useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

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
const HEIGHT = 42;
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
    backgroundColor: interpolateColor(
      backgroundTransition.value,
      [0, 1],
      ["hsl(257.9412, 100%, 60%)", "hsl(257.9412, 100%, 54%)"],
    ),
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
    <Pressable
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
      <View
        className={cn(
          "bg-primary rounded-lg h-[42px] overflow-hidden",
          isDisabled && "opacity-50",
        )}
      >
        <Animated.View style={animatedScrollingContainerStyle}>
          {steps.reverse().map((step) => (
            <View
              key={step.title}
              className="flex-row items-center justify-center gap-2 h-[42px] px-3 py-2"
            >
              {step.Icon}
              <Text
                numberOfLines={1}
                className="text-primary-foreground text-lg font-semibold flex-shrink"
              >
                {step.title}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </Pressable>
  );
};
