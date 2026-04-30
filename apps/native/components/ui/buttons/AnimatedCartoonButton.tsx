import { ReactElement } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

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

const SHADOW_HEIGHT = 10;

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
      <View>
        <View className="bg-primary/90 rounded-lg h-[42px] top-[10px]" />
        <Animated.View
          className={cn(
            "bg-primary flex-row items-center justify-center gap-2 h-[42px] px-3 py-2 rounded-lg absolute w-full",
            isDisabled && "opacity-50",
          )}
          style={animatedStyle}
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
      </View>
    </Pressable>
  );
};
