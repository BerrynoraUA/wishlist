import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import type { Item } from "@wishlist/backend/types/item";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import * as Clipboard from "expo-clipboard";
import { Gift, Heart, PackageCheck } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

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
  const t = useGT();
  const reservation = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
    isOwner,
  });
  const reservationLabel = buildReservationLabel(
    {
      ...reservation,
      reservedByName,
    },
    t,
  );
  const priorityLabel = getTranslatedItemPriorityLabel(t, item.priority_id);
  const priority = getItemPriority(item.priority_id);
  const store = getItemStoreFromUrl(item.url);
  const itemUrl = item.url?.trim() ?? "";
  const showCopyLink = itemUrl.length > 0;
  const showMenu = Boolean(showCopyLink || (isOwner && (onEdit || onDelete)));
  const salePercentOff = getSalePercentOff(
    item.price,
    item.discount_price,
    showDiscountBadge && item.has_discount,
  );
  const menuTriggerRef = React.useRef<TriggerRef>(null);

  async function handleCopyLink() {
    if (!itemUrl) return;
    await Clipboard.setStringAsync(itemUrl);
  }

  return (
    <View style={{ width }}>
      <DropdownMenu className="relative">
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={t('Open "{name}"', { name: item.name })}
          onPress={onPress}
          onLongPress={showMenu ? () => menuTriggerRef.current?.open() : undefined}
          pressedScale={0.98}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
        >
          <View className="relative aspect-square w-full min-h-0 items-center justify-center overflow-hidden bg-bg-muted">
            {item.image_url ? (
              <StyledImage
                source={{ uri: item.image_url }}
                contentFit="cover"
                contentPosition="center"
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
              {priority && priorityLabel ? (
                <ItemPriorityBadge
                  priority={priority}
                  label={priorityLabel}
                  compact
                  context="card"
                />
              ) : null}
            </View>
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
                      <Text
                        className="text-xs font-bold text-text-muted line-through"
                        numberOfLines={1}
                      >
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

              {!isOwner && onToggleVote ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={hasVoted ? t("Remove vote") : t("Vote for item")}
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
        {showMenu ? (
          <DropdownMenuTrigger asChild>
            <AnimatedPressable
              ref={menuTriggerRef}
              pointerEvents="none"
              className="absolute right-3 top-36 size-8 opacity-0"
            />
          </DropdownMenuTrigger>
        ) : null}
        <DropdownMenuContent className="min-w-36">
          {showCopyLink ? (
            <DropdownMenuItem onPress={handleCopyLink}>
              <Text>{t("Copy link")}</Text>
            </DropdownMenuItem>
          ) : null}
          {onEdit ? (
            <DropdownMenuItem onPress={onEdit}>
              <Text>{t("Edit")}</Text>
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem variant="destructive" onPress={onDelete}>
              <Text>{t("Delete")}</Text>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}
