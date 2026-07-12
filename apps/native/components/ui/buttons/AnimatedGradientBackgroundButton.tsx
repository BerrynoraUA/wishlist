import { ReactElement, useEffect, useState } from "react";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ActivityIndicator, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import {
  animatedButtonDisabledClassName,
  animatedButtonTextClassName,
} from "@/components/ui/buttons/button-styles";

export interface AnimatedGradientBackgroundButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
  variant?: "default" | "brand";
}

const HEIGHT = 44;

export const AnimatedGradientBackgroundButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
  variant = "default",
}: AnimatedGradientBackgroundButtonProps) => {
  const transition = useSharedValue(0);
  const [outerContainerWidth, setOuterContainerWidth] = useState(0);

  useEffect(() => {
    transition.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(transition);
    };
  }, [transition]);

  const translateX = useDerivedValue(() =>
    interpolate(transition.value, [0, 1], [-2 * outerContainerWidth, 0]),
  );

  const animatedGradientContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
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
      style={{ flexShrink: 0 }}
    >
      {({ pressed }) => (
        <View
          onLayout={({ nativeEvent }) => setOuterContainerWidth(nativeEvent.layout.width)}
          className={cn(
            "h-11 overflow-hidden shadow-sm shadow-black/5",
            variant === "brand"
              ? "rounded-lg border border-brand/25 bg-brand-lighter"
              : "rounded-md bg-primary",
            isDisabled && animatedButtonDisabledClassName,
          )}
        >
          <Animated.View
            className={cn(
              "absolute bg-linear-135",
              variant === "brand"
                ? "from-brand-lighter via-brand/25 to-brand-lighter"
                : "from-primary via-accent-foreground to-brand",
            )}
            style={[
              animatedGradientContainerStyle,
              {
                height: HEIGHT,
                width: outerContainerWidth * 3,
              },
            ]}
          />
          <View
            className={cn(
              "h-11 flex-row items-center justify-center gap-2 px-4 py-2",
              variant === "brand" ? "rounded-lg" : "rounded-md",
              pressed && (variant === "brand" ? "bg-brand/10" : "bg-primary/20"),
            )}
          >
            {isLoading ? (
              <ActivityIndicator
                colorClassName={variant === "brand" ? "accent-brand" : "accent-primary-foreground"}
                size="small"
              />
            ) : (
              <>
                {Icon}
                <Text
                  numberOfLines={1}
                  className={variant === "brand" ? "text-brand" : animatedButtonTextClassName}
                >
                  {title}
                </Text>
              </>
            )}
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
};
