import { Text } from "@/components/ui/text";
import { Image, type ImageSource } from "expo-image";
import { View } from "react-native";

export type MascotVariant =
  | "sad-alone"
  | "gift-in-hands"
  | "empty-hands-shrug"
  | "magnifying-glass"
  | "explorer-map"
  | "sleeping-bell"
  | "lightbulb-idea"
  | "santa-sack"
  | "holding-key";

const MASCOT_IMAGES: Record<MascotVariant, ImageSource> = {
  "sad-alone": require("@/assets/images/mascot/sad-alone.webp"),
  "gift-in-hands": require("@/assets/images/mascot/gift-in-hands.webp"),
  "empty-hands-shrug": require("@/assets/images/mascot/empty-hands-shrug.webp"),
  "magnifying-glass": require("@/assets/images/mascot/magnifying-glass.webp"),
  "explorer-map": require("@/assets/images/mascot/explorer-map.webp"),
  "sleeping-bell": require("@/assets/images/mascot/sleeping-bell.webp"),
  "lightbulb-idea": require("@/assets/images/mascot/lightbulb-idea.webp"),
  "santa-sack": require("@/assets/images/mascot/santa-sack.webp"),
  "holding-key": require("@/assets/images/mascot/holding-key.webp"),
};

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
      <Image
        source={MASCOT_IMAGES[variant]}
        accessibilityElementsHidden
        contentFit="contain"
        style={{ height: size, width: size }}
      />
      <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
    </View>
  );
}
