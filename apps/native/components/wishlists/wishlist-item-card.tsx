import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemPriorityLabel,
  getItemReservationState,
  getItemStoreFromUrl,
} from "@/lib/items";
import { cn } from "@/lib/utils";
import type { Item } from "@wishlist/backend/types/item";
import { Image as ExpoImage } from "expo-image";
import { Gift, Heart, PackageCheck, Pencil, Trash2 } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

export function WishlistItemCard({
  item,
  width,
  currentUserId,
  isOwner,
  showDiscountBadge,
  reservedByName,
  voteCount,
  hasVoted,
  onPress,
  onEdit,
  onDelete,
  onToggleVote,
}: {
  item: Item;
  width: number;
  currentUserId: string;
  isOwner: boolean;
  showDiscountBadge: boolean;
  reservedByName?: string | null;
  voteCount: number;
  hasVoted: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVote?: () => void;
}) {
  const reservation = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
    isOwner,
  });
  const reservationLabel = buildReservationLabel({
    ...reservation,
    reservedByName,
  });
  const priorityLabel = getItemPriorityLabel(item.priority);
  const store = getItemStoreFromUrl(item.url);

  return (
    <View style={{ width }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
        onPress={onPress}
        pressedScale={0.98}
        className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
      >
        <View className="relative h-[132px] items-center justify-center overflow-hidden bg-bg-muted">
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              contentFit="cover"
              className="absolute inset-0 size-full"
            />
          ) : (
            <Icon as={Gift} className="size-10 text-text-light" />
          )}

          {reservationLabel ? (
            <View
              className={cn(
                "absolute left-2 top-2 rounded-full px-2 py-1",
                reservation.isPurchased ? "bg-success-bg" : "bg-card-bg/90",
              )}
            >
              <Text
                className={cn(
                  "text-[11px] font-extrabold",
                  reservation.isPurchased ? "text-success" : "text-text-muted",
                )}
                numberOfLines={1}
              >
                {reservationLabel}
              </Text>
            </View>
          ) : null}

          {showDiscountBadge && item.has_discount && item.discount_price ? (
            <View className="absolute right-2 top-2 rounded-full bg-danger px-2 py-1">
              <Text className="text-[11px] font-extrabold text-white">Sale</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-2 p-3">
          <View className="min-h-10 flex-row items-start gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold leading-5 text-text" numberOfLines={2}>
                {item.name}
              </Text>
              {store ? (
                <Text className="mt-0.5 text-xs font-semibold text-text-muted" numberOfLines={1}>
                  {store}
                </Text>
              ) : null}
            </View>

            {isOwner ? (
              <View className="flex-row gap-1">
                {onEdit ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit item"
                    onPress={(event) => {
                      event.stopPropagation();
                      onEdit();
                    }}
                    className="size-8 items-center justify-center rounded-full bg-bg-subtle"
                  >
                    <Icon as={Pencil} className="size-3.5 text-text-muted" />
                  </AnimatedPressable>
                ) : null}
                {onDelete ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete item"
                    onPress={(event) => {
                      event.stopPropagation();
                      onDelete();
                    }}
                    className="size-8 items-center justify-center rounded-full bg-danger-bg"
                  >
                    <Icon as={Trash2} className="size-3.5 text-danger" />
                  </AnimatedPressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
              {item.price ? (
                <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
                  {item.currency ? `${item.currency} ` : ""}
                  {item.has_discount && item.discount_price ? item.discount_price : item.price}
                </Text>
              ) : null}
              {priorityLabel ? (
                <Text className="rounded-full bg-bg-subtle px-2 py-1 text-[11px] font-bold text-text-muted">
                  {priorityLabel}
                </Text>
              ) : null}
            </View>

            {!isOwner && onToggleVote ? (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={hasVoted ? "Remove vote" : "Vote for item"}
                onPress={(event) => {
                  event.stopPropagation();
                  onToggleVote();
                }}
                className={cn(
                  "flex-row items-center gap-1 rounded-full px-2 py-1",
                  hasVoted ? "bg-brand-lighter" : "bg-bg-subtle",
                )}
              >
                <Icon
                  as={Heart}
                  className={cn("size-3.5", hasVoted ? "text-brand" : "text-text-muted")}
                />
                <Text
                  className={cn("text-xs font-bold", hasVoted ? "text-brand" : "text-text-muted")}
                >
                  {voteCount}
                </Text>
              </AnimatedPressable>
            ) : reservation.isPurchased ? (
              <Icon as={PackageCheck} className="size-4 text-success" />
            ) : null}
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
}
