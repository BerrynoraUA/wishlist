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

  const swatches = [
    <StyledPressable
      key="none"
      accessibilityRole="button"
      accessibilityState={{ selected: value === null }}
      accessibilityLabel={t("No color")}
      onPress={() => onChange(null)}
      className={cn(
        "size-10 items-center justify-center rounded-full border-2 bg-bg-muted active:opacity-80",
        value === null ? "border-text" : "border-transparent",
      )}
    >
      <Icon as={Ban} className="size-5 text-text-muted" />
    </StyledPressable>,
    ...ITEM_COLORS.map((color, index) => (
      <StyledPressable
        key={color.color}
        accessibilityRole="button"
        accessibilityState={{ selected: value === index }}
        accessibilityLabel={color.label}
        onPress={() => onChange(index)}
        className={cn(
          "size-10 items-center justify-center rounded-full border-2 active:opacity-80",
          value === index ? "border-text" : "border-transparent",
        )}
        style={{ backgroundColor: color.color }}
      >
        {value === index ? <Icon as={Check} className="size-5 text-white" strokeWidth={3} /> : null}
      </StyledPressable>
    )),
  ];
  // Two balanced rows laid out as a grid: the shorter row is padded with empty slots so
  // its swatches line up under the columns of the first one.
  const columns = Math.ceil(swatches.length / 2);
  const rows = [swatches.slice(0, columns), swatches.slice(columns)];

  return (
    <View className="gap-2">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-between">
          {row}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`empty-${index}`} className="size-10" />
          ))}
        </View>
      ))}
    </View>
  );
}
