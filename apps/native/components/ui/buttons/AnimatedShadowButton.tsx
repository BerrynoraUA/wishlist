import { ReactElement } from "react";
import { ActivityIndicator, Platform, Pressable } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

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
          shadowRadius: interpolate(
            transition.value,
            [0, 1],
            [elevation / 1.5, 0],
          ),
        },
  );

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
        if (isActive.value && transition.value === 1) {
          transition.value = withTiming(0, { duration: DURATION });
        }
        isActive.value = false;
      }}
    >
      <Animated.View
        className={cn(
          "bg-primary flex-row items-center justify-center gap-2 h-[42px] px-3 py-2 rounded-lg shadow-lg",
          Platform.select({
            ios: "shadow-black/50",
            android: "",
          }),
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
    </Pressable>
  );
};
