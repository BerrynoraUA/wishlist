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

export interface AnimatedCartoonButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const DURATION = 300;

const SHADOW_HEIGHT = 8;

export const AnimatedCartoonButton = ({
  accessibilityHint,
  accessibilityLabel,
  Icon,
  isDisabled = false,
  isLoading = false,
  onPress,
  title,
}: AnimatedCartoonButtonProps) => {
  const transition = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    top: interpolate(transition.value, [0, 1], [0, SHADOW_HEIGHT]),
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
        <View>
          <View className="top-2 h-10 rounded-md bg-primary/80 sm:h-9" />
          <Animated.View
            className={cn(
              animatedButtonClassName,
              "absolute w-full overflow-hidden",
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
        </View>
      )}
    </AnimatedPressable>
  );
};
