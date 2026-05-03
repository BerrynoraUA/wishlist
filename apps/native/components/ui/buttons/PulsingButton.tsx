import { ReactElement, useEffect } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
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

export interface PulsingButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

export interface PulseProps {
  index: number;
  isDisabled?: boolean;
  isLoading?: boolean;
}

const BACKGROUND_TRANSITION_DURATION = 300;

const NUMBER_OF_PULSES = 2;
const PULSE_TRANSITION_DURATION = 2000;
const PULSE_DELAY = 700;

const Pulse = ({ index, isDisabled, isLoading }: PulseProps) => {
  const transition = useSharedValue(0);

  useEffect(() => {
    if (isDisabled || isLoading) {
      cancelAnimation(transition);
      transition.value = 0;
      return;
    }

    transition.value = withRepeat(
      withSequence(
        withDelay(
          PULSE_DELAY * index,
          withTiming(1, {
            duration: PULSE_TRANSITION_DURATION + PULSE_DELAY * (NUMBER_OF_PULSES - index - 1),
            easing: Easing.out(Easing.ease),
          }),
        ),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );

    return () => {
      cancelAnimation(transition);
    };
  }, [index, isDisabled, isLoading, transition]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [0.5, 0]),
    transform: [
      {
        scale: interpolate(transition.value, [0, 1], [1, 1.5]),
      },
    ],
  }));

  return (
    <Animated.View
      className="absolute h-10 w-full rounded-md bg-primary sm:h-9"
      style={animatedStyle}
    />
  );
};

export const PulsingButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: PulsingButtonProps) => {
  const backgroundTransition = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backgroundTransition.value, [0, 1], [1, 0.9]),
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
        <>
          {Array.from({ length: NUMBER_OF_PULSES }).map((_, index) => (
            <Pulse key={index} index={index} isDisabled={isDisabled} isLoading={isLoading} />
          ))}
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
            <Animated.View
              pointerEvents="none"
              className={cn("absolute inset-0 rounded-md", pressed && "bg-primary/20")}
            />
          </Animated.View>
        </>
      )}
    </AnimatedPressable>
  );
};
