import { ReactElement } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator, Platform, View } from "react-native";
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

export interface AnimatedShadowButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  elevation?: number;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const DURATION = 300;

export const AnimatedShadowButton = ({
  accessibilityHint,
  accessibilityLabel,
  elevation = 16,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: AnimatedShadowButtonProps) => {
  const transition = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() =>
    Platform.OS === "android"
      ? {
          elevation: interpolate(transition.value, [0, 1], [elevation, 0]),
        }
      : {
          shadowOffset: {
            width: 0,
            height: interpolate(transition.value, [0, 1], [elevation / 2, 0]),
          },
          shadowRadius: interpolate(transition.value, [0, 1], [elevation / 1.5, 0]),
        },
  );

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
        if (isActive.value && transition.value === 1) {
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
            Platform.select({
              ios: "shadow-black/50",
              android: "",
            }),
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
