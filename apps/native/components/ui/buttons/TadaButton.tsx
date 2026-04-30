import { ReactElement, useEffect } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import Animated, {
  cancelAnimation,
  Extrapolation,
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

export interface TadaButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const BACKGROUND_TRANSITION_DURATION = 300;
const ROTATION_TRANSITION_DELAY = 3000;
const ROTATION_TRANSITION_DURATION = 300;

export const TadaButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: TadaButtonProps) => {
  const rotationTransition = useSharedValue(0);
  const backgroundTransition = useSharedValue(0);
  const isActive = useSharedValue(false);

  useEffect(() => {
    if (isDisabled || isLoading) {
      cancelAnimation(rotationTransition);
      rotationTransition.value = 0;
      return;
    }

    rotationTransition.value = withRepeat(
      withDelay(
        ROTATION_TRANSITION_DELAY,
        withSequence(
          withTiming(1, { duration: ROTATION_TRANSITION_DURATION }),
          withTiming(0, { duration: ROTATION_TRANSITION_DURATION }),
        ),
      ),
      -1,
    );

    return () => {
      cancelAnimation(rotationTransition);
    };
  }, [isDisabled, isLoading, rotationTransition]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundTransition.value,
      [0, 1],
      ["hsl(257.9412, 100%, 60%)", "hsl(257.9412, 100%, 54%)"],
    ),
    transform: [
      {
        rotateZ: `${interpolate(
          rotationTransition.value,
          [0, 0.5, 1],
          [0, -5, 5],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
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
