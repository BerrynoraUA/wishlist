import { Icon } from "@/components/ui/icon";
import { Flag } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { Pressable } from "react-native";

/**
 * Report control for an item that belongs to someone else. It rides on the item image
 * rather than sitting in the sheet's action row: reporting is a rare, out-of-band action,
 * and the row is for the things a guest actually came to do — reserve, buy, save.
 */
export function ItemReportButton({ onPress }: { onPress: () => void }) {
  const t = useGT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Report this item")}
      onPress={onPress}
      hitSlop={8}
      className="size-9 items-center justify-center rounded-full border border-border-subtle bg-card-bg/95 shadow-sm active:opacity-80"
    >
      <Icon as={Flag} className="size-4 text-text-muted" />
    </Pressable>
  );
}
