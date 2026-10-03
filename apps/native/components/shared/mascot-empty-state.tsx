import { AnimatedMascot, type MascotVariant } from "@/components/shared/animated-mascot";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export type { MascotVariant };

export function MascotEmptyState({
  message,
  variant,
  compact = false,
}: {
  message: string;
  variant: MascotVariant;
  compact?: boolean;
}) {
  const size = compact ? 96 : 176;

  return (
    <View className="items-center justify-center gap-3 p-4">
      <AnimatedMascot variant={variant} size={size} subtle={compact} />
      <Animated.View entering={FadeIn.delay(120).duration(280)}>
        <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
      </Animated.View>
    </View>
  );
}
