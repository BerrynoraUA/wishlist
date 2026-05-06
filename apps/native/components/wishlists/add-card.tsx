import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "@/components/ui/linear-gradient";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { getThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { useUniwind } from "uniwind";

const ADD_CARD_GRADIENTS = {
  light: {
    base: ["#fde7f3", "#f6dce8"] as const,
    sheen: ["rgba(255,255,255,0.82)", "rgba(255,255,255,0.64)", "rgba(255,255,255,0.4)"] as const,
    tint: ["rgba(192,38,126,0)", "rgba(192,38,126,0.16)"] as const,
  },
  dark: {
    base: ["#201521", "#17131a"] as const,
    sheen: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"] as const,
    tint: ["rgba(224,82,160,0)", "rgba(224,82,160,0.18)"] as const,
  },
};

export function AddCard({
  width,
  onPress,
  accessibilityLabel,
}: {
  width: number;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { theme } = useUniwind();
  const mode = getThemeMode(theme);
  const gradients = ADD_CARD_GRADIENTS[mode];

  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ width }}
      className={cn(
        "relative h-[184px] items-center justify-center overflow-hidden rounded-[28px]",
        "bg-[#f6dce8] dark:bg-[#17131a]",
        "shadow-[0px_18px_34px_rgba(148,163,184,0.16)] dark:shadow-[0px_18px_34px_rgba(0,0,0,0.28)]",
        "active:opacity-95",
      )}
    >
      <View className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
        <LinearGradient
          colors={gradients.base}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          className="absolute inset-0"
        />
        <LinearGradient
          colors={gradients.sheen}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          className="absolute inset-0"
        />
        <LinearGradient
          colors={gradients.tint}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          className="absolute inset-0"
        />
      </View>
      <Icon
        as={Plus}
        className="relative z-10 size-[84px] text-[rgba(100,116,139,0.88)] dark:text-[rgba(156,163,175,0.9)]"
        strokeWidth={1.25}
      />
    </StyledPressable>
  );
}
