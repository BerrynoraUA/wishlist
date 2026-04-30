import { LinearGradient } from "expo-linear-gradient";
import { ReactElement, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

export interface AnimatedGradientBackgroundButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  Icon?: ReactElement;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
}

const HEIGHT = 42;

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
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
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
    >
      {({ pressed }) => (
        <View
          onLayout={({ nativeEvent }) => setOuterContainerWidth(nativeEvent.layout.width)}
          className="rounded-lg overflow-hidden w-full"
        >
          <Animated.View style={animatedGradientContainerStyle}>
            <LinearGradient
              colors={[
                "hsl(257.9412, 100%, 60%)",
                "hsl(257.9412, 100%, 48%)",
                "hsl(257.9412, 100%, 60%)",
              ]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 1 }}
              style={{
                height: HEIGHT,
                width: outerContainerWidth * 3,
              }}
            />
          </Animated.View>
          <View
            className={cn(
              "flex-row items-center justify-center gap-2 h-[42px] px-3 py-2 absolute w-full",
              pressed && "bg-primary/20",
            )}
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
          </View>
        </View>
      )}
    </Pressable>
  );
};
