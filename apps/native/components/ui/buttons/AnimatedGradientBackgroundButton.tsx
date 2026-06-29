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
}

const HEIGHT = 40;

export const AnimatedGradientBackgroundButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
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
            "h-10 overflow-hidden rounded-md bg-primary shadow-sm shadow-black/5 sm:h-9",
            isDisabled && animatedButtonDisabledClassName,
          )}
        >
          <Animated.View
            className="absolute bg-linear-135 from-primary via-accent-foreground to-brand"
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
              "h-10 flex-row items-center justify-center gap-2 rounded-md px-4 py-2 sm:h-9",
              pressed && "bg-primary/20",
            )}
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
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
};
