import { ReactElement, useEffect } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator, View } from "react-native";
import Animated, {
  cancelAnimation,
  Extrapolation,
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
    opacity: interpolate(backgroundTransition.value, [0, 1], [1, 0.9]),
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
