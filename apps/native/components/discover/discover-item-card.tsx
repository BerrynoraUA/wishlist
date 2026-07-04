import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { ItemPriorityBadge, ItemStatusBadge } from "@/components/items/item-labels";
import {
  buildReservationLabel,
  getItemPriority,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
} from "@/lib/items";
import type { Item } from "@wishlist/backend/types/item";
import { Gift } from "lucide-react-native";
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
  const store = getItemStoreFromUrl(item.url);
  const salePercentOff = getSalePercentOff(item.price, item.discount_price, item.has_discount);

  return (
    <View style={{ width }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t('Open "{name}"', { name: item.name })}
        onPress={onPress}
        pressedScale={0.98}
        className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
        style={purchasedMode ? { borderColor: "rgba(22, 163, 74, 0.18)" } : undefined}
      >
        <View className="relative aspect-square w-full items-center justify-center overflow-hidden bg-bg-muted">
          {item.image_url ? (
            <StyledImage
              source={{ uri: item.image_url }}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
              recyclingKey={item.id}
              className="absolute inset-0 size-full"
            />
          ) : (
            <Icon as={Gift} className="size-10 text-text-light" />
          )}

          {reservationLabel ? (
            <View className="absolute left-2 top-2 z-10 max-w-[70%]">
              <ItemStatusBadge
                label={reservationLabel}
                purchased={reservation.isPurchased}
                compact={salePercentOff != null}
              />
            </View>
          ) : null}

          <View className="absolute right-2 top-2 z-10 items-end gap-1.5">
            {salePercentOff != null ? (
              <View className="rounded-full border border-danger bg-danger-bg px-2 py-1">
                <Text className="text-[11px] font-extrabold text-danger">
                  {t("Sale -{percent}%", { percent: salePercentOff })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-2 p-3">
          <View className="min-h-10">
            <Text className="text-sm font-extrabold leading-5 text-text" numberOfLines={2}>
              {item.name}
            </Text>
            {store ? (
              <Text className="mt-0.5 text-xs font-semibold text-text-muted" numberOfLines={1}>
                {store}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
              {item.price ? (
                item.has_discount && item.discount_price ? (
                  <>
                    <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
                      {item.currency ? `${item.currency} ` : ""}
                      {item.discount_price}
                    </Text>
                    <Text className="text-xs font-bold text-text-muted line-through">
                      {item.currency ? `${item.currency} ` : ""}
                      {item.price}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
                    {item.currency ? `${item.currency} ` : ""}
                    {item.price}
                  </Text>
                )
              ) : null}
            </View>
            {priority && priorityLabel ? (
              <ItemPriorityBadge priority={priority} label={priorityLabel} compact context="card" />
            ) : null}
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
}
