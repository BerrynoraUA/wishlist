import { ReactElement, useEffect } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

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
            duration:
              PULSE_TRANSITION_DURATION +
              PULSE_DELAY * (NUMBER_OF_PULSES - index - 1),
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
      className="bg-primary rounded-lg h-[42px] absolute w-full"
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
    backgroundColor: interpolateColor(
      backgroundTransition.value,
      [0, 1],
      ["hsl(257.9412, 100%, 60%)", "hsl(257.9412, 100%, 54%)"],
    ),
  }));

  return (
    <Pressable
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
      {Array.from({ length: NUMBER_OF_PULSES }).map((_, index) => (
        <Pulse
          key={index}
          index={index}
          isDisabled={isDisabled}
          isLoading={isLoading}
        />
      ))}
      <Animated.View
        className={cn(
          "flex-row items-center justify-center gap-2 h-[42px] px-3 py-2 rounded-lg",
          isDisabled && "opacity-50",
        )}
        style={animatedContainerStyle}
      >
        {isLoading ? (
          <ActivityIndicator color="hsl(0, 0%, 100%)" size={18} />
        ) : (
          <>
            {Icon}
            <Text
              numberOfLines={1}
              className="text-primary-foreground text-lg font-semibold flex-shrink"
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};
