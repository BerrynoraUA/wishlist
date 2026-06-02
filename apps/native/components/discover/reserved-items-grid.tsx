import { DiscoverItemCard } from "@/components/discover/discover-item-card";
import { Text } from "@/components/ui/text";
import { normalizeReservedItem } from "@/lib/discover";
import { chunkRows } from "@/lib/layout";
import type { ReservedItem } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function ReservedItemsGrid({
  items,
  columns,
  cardWidth,
  gridGap,
  currentUserId,
  purchased,
  onOpenItem,
}: {
  items: ReservedItem[];
  columns: number;
  cardWidth: number;
  gridGap: number;
  currentUserId?: string | null;
  purchased?: boolean;
  onOpenItem: (item: Item) => void;
}) {
  const t = useGT();
  const normalized = React.useMemo(
    () => items.map((item) => ({ source: item, item: normalizeReservedItem(item, currentUserId) })),
    [currentUserId, items],
  );
  const rows = React.useMemo(() => chunkRows(normalized, columns), [columns, normalized]);

  return (
    <View className="gap-4">
      {rows.map((row) => (
        <View key={row.map((entry) => entry.item.id).join(":")} className="flex-row" style={{ gap: gridGap }}>
          {row.map(({ source, item }) => (
            <View key={item.id} className="gap-2" style={{ width: cardWidth }}>
              <Text className="text-xs font-bold text-text-muted" numberOfLines={1}>
                {purchased
                  ? t("Purchased for {name}", { name: source.owner_name })
                  : t("For {name}", { name: source.owner_name })}
              </Text>
              <DiscoverItemCard
                item={item}
                width={cardWidth}
                currentUserId={currentUserId}
                reservedByName={source.owner_name}
                onPress={() => onOpenItem(item)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
