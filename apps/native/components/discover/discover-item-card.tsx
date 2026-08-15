import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ItemImage } from "@/components/items/item-image";
import { ItemPriorityMedallion, useItemCardBorderStyle } from "@/components/items/item-labels";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemPriority,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
} from "@/lib/items";
import { cn } from "@/lib/utils";
import { isStarPriorityId } from "@wishlist/backend/lib";
import type { Item } from "@wishlist/backend/types/item";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function DiscoverItemCard({
  item,
  width,
  currentUserId,
  reservedByName,
  purchasedMode = false,
  onPress,
}: {
  item: Item;
  width: number;
  currentUserId?: string | null;
  reservedByName?: string | null;
  purchasedMode?: boolean;
  onPress: () => void;
}) {
  const t = useGT();
  const reservation = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
    isOwner: false,
  });
  const reservationLabel = buildReservationLabel({ ...reservation, reservedByName }, t);
  const priorityLabel = getTranslatedItemPriorityLabel(t, item.priority_id) ?? item.priority_name;
  const priority = getItemPriority(item.priority_id ?? item.priority_name);
  const cardBorderStyle = useItemCardBorderStyle(priority);
  const store = getItemStoreFromUrl(item.url);
  const salePercentOff = getSalePercentOff(item.price, item.discount_price, item.has_discount);
  const isTaken = Boolean(reservationLabel);

  return (
    <View style={{ width }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t('Open "{name}"', { name: item.name })}
        onPress={onPress}
        pressedScale={0.98}
        className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
        // Purchased state wins, otherwise the priority tints the card.
        style={purchasedMode ? { borderColor: "rgba(22, 163, 74, 0.18)" } : cardBorderStyle}
      >
        <ItemImage
          item={item}
          reservationLabel={reservationLabel}
          purchased={reservation.isPurchased}
          priority={priority}
          priorityLabel={priorityLabel}
          salePercentOff={salePercentOff}
          showDiscountPrice={Boolean(item.has_discount)}
          size="card"
        />

        <View className="gap-2 p-3">
          <View className="min-h-10">
            <Text
              className={cn("text-sm font-extrabold leading-5 text-text", isTaken && "opacity-50")}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {store ? (
              <Text
                className={cn(
                  "mt-0.5 text-xs font-semibold text-text-muted",
                  isTaken && "opacity-50",
                )}
                numberOfLines={1}
              >
                {store}
              </Text>
            ) : null}
          </View>
        </View>
      </AnimatedPressable>

      {/* Hangs off the bottom edge, centred — same placement as the web card. */}
      {priority && isStarPriorityId(priority.id) ? (
        <View className="absolute inset-x-0 -bottom-3.5 z-10 items-center" pointerEvents="none">
          <ItemPriorityMedallion priority={priority} label={priorityLabel} />
        </View>
      ) : null}
    </View>
  );
}
