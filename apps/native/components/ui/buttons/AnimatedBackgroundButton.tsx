import { ReactElement } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator, View } from "react-native";
import Animated, {
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

export interface AnimatedBackgroundButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const DURATION = 300;

export const AnimatedBackgroundButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: AnimatedBackgroundButtonProps) => {
  const transition = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0.9]),
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
        <Animated.View
          className={cn(
            animatedButtonClassName,
            "relative overflow-hidden",
            isDisabled && animatedButtonDisabledClassName,
          )}
          style={animatedStyle}
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
