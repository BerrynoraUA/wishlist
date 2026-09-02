import { Icon } from "@/components/ui/icon";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { cn } from "@/lib/utils";
import { ITEM_COLORS } from "@wishlist/backend/lib/item-colors";
import { Ban, Check } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { View } from "react-native";

/**
 * Card colour for an item — the swatch row that decides whether the card glows, and in
 * which colour. Mirrors the picker on the web modals; priorities no longer tint cards.
 */
export function ItemColorSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (colorIndex: number | null) => void;
}) {
  const t = useGT();

  return (
    <View className="flex-row flex-wrap gap-2">
      <StyledPressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel={t("No color")}
        onPress={() => onChange(null)}
        className={cn(
          "size-9 items-center justify-center rounded-full border-2 bg-bg-muted active:opacity-80",
          value === null ? "border-text" : "border-transparent",
        )}
      >
        <Icon as={Ban} className="size-4 text-text-muted" />
      </StyledPressable>

      {ITEM_COLORS.map((color, index) => (
        <StyledPressable
          key={color.color}
          accessibilityRole="button"
          accessibilityState={{ selected: value === index }}
          accessibilityLabel={color.label}
          onPress={() => onChange(index)}
          className={cn(
            "size-9 items-center justify-center rounded-full border-2 active:opacity-80",
            value === index ? "border-text" : "border-transparent",
          )}
          style={{ backgroundColor: color.color }}
        >
          {value === index ? (
            <Icon as={Check} className="size-4 text-white" strokeWidth={3} />
          ) : null}
        </StyledPressable>
      ))}
    </View>
  );
}
