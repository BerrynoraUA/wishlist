import { DiscoverItemCard } from "@/components/discover/discover-item-card";
import { Text } from "@/components/ui/text";
import { normalizeReservedItem } from "@/lib/discover";
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
  headerAccessory,
  onOpenItem,
}: {
  items: ReservedItem[];
  columns: number;
  cardWidth: number;
  gridGap: number;
  currentUserId?: string | null;
  purchased?: boolean;
  headerAccessory?: React.ReactNode;
  onOpenItem: (item: Item, reservedByName?: string | null) => void;
}) {
  const t = useGT();
  const normalized = React.useMemo(
    () => items.map((item) => ({ source: item, item: normalizeReservedItem(item, currentUserId) })),
    [currentUserId, items],
  );
  // Cards are as tall as their photos, so each column stacks on its own (masonry) rather
  // than in rows that would leave gaps under the shorter cards.
  const stacks = React.useMemo(
    () =>
      Array.from({ length: columns }, (_, column) =>
        normalized.filter((_, index) => index % columns === column),
      ),
    [columns, normalized],
  );

  return (
    <View className="flex-row items-start" style={{ gap: gridGap }}>
      {stacks.map((stack, column) => (
        <View key={column} className="gap-4">
          {stack.map(({ source, item }, index) => (
            <View key={item.id} className="gap-2" style={{ width: cardWidth }}>
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className="min-w-0 flex-1 text-xs font-bold text-text-muted"
                  numberOfLines={1}
                >
                  {purchased
                    ? t("Purchased for {name}", { name: source.owner_name })
                    : t("For {name}", { name: source.owner_name })}
                </Text>
                {column === 0 && index === 0 ? headerAccessory : null}
              </View>
              <DiscoverItemCard
                item={item}
                width={cardWidth}
                currentUserId={currentUserId}
                purchasedMode={purchased}
                onPress={() => onOpenItem(item)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
