import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { ItemPriorityBadge, ItemStatusBadge } from "@/components/items/item-labels";
import { cn } from "@/lib/utils";
import type { Item } from "@wishlist/backend/types/item";
import { Gift } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function ItemImage({
  item,
  reservationLabel,
  purchased,
  reserved,
  priority,
  priorityLabel,
  salePercentOff,
  showDiscountPrice,
  size,
}: {
  item: Item;
  reservationLabel?: string | null;
  purchased: boolean;
  reserved: boolean;
  priority: ReturnType<typeof import("@/lib/items").getItemPriority>;
  priorityLabel?: string | null;
  salePercentOff?: number | null;
  showDiscountPrice: boolean;
  size: "card" | "detail";
}) {
  const t = useGT();
  const isDetail = size === "detail";
  const isTaken = Boolean(reservationLabel);

  return (
    <View
      className={cn(
        "relative items-center justify-center overflow-hidden bg-bg-muted",
        isDetail ? "h-56 rounded-2xl border border-border-subtle" : "aspect-square w-full min-h-0",
      )}
    >
      {item.image_url ? (
        <StyledImage
          source={{ uri: item.image_url }}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          className={cn("absolute inset-0 size-full", isTaken && "opacity-40")}
        />
      ) : (
        <Icon
          as={Gift}
          className={cn(
            isDetail ? "size-12 text-text-light" : "size-10 text-text-light",
            isTaken && "opacity-40",
          )}
        />
      )}

      {isTaken ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute inset-0 items-center justify-center"
        >
          <View
            className="w-[170%] items-center bg-black/70 py-1.5"
            style={{ transform: [{ rotate: "-20deg" }] }}
          >
            <Text
              className={cn(
                "font-extrabold uppercase tracking-widest text-brand",
                isDetail ? "text-xl" : "text-lg",
              )}
            >
              {purchased ? t("Purchased") : t("Reserved")}
            </Text>
          </View>
        </View>
      ) : null}

      {reserved && reservationLabel ? (
        <View
          className={cn(
            "absolute start-2 top-2 z-10 max-w-[70%]",
            isDetail && "start-3 top-3 max-w-[80%]",
          )}
        >
          <ItemStatusBadge
            label={reservationLabel}
            purchased={isDetail ? false : purchased}
            compact={!isDetail && salePercentOff != null}
          />
        </View>
      ) : null}

      <View
        className={cn(
          "absolute end-2 top-2 z-10 items-end gap-1.5",
          isDetail && "end-3 top-3 max-w-[45%]",
        )}
      >
        {salePercentOff != null ? (
          <Text className="rounded-full border border-danger bg-danger-bg px-2 py-1 text-[11px] font-extrabold text-danger">
            {t("Sale -{percent}%", { percent: salePercentOff })}
          </Text>
        ) : null}
        {priority && priorityLabel ? (
          <ItemPriorityBadge priority={priority} label={priorityLabel} compact context="card" />
        ) : null}
      </View>

      {item.price ? (
        <View
          className={cn(
            "absolute bottom-2 end-2 z-10 flex-row items-center gap-1 rounded-full border border-brand/30 bg-card-bg/95 px-2.5 py-1",
            isDetail && "bottom-3 end-3 gap-2 px-3 py-1.5",
          )}
        >
          {showDiscountPrice && item.discount_price ? (
            <>
              <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
                {item.currency ? `${item.currency} ` : ""}
                {item.discount_price}
              </Text>
              <Text className="text-xs font-bold text-text-muted line-through" numberOfLines={1}>
                {item.currency ? `${item.currency} ` : ""}
                {item.price}
              </Text>
            </>
          ) : (
            <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
              {item.currency ? `${item.currency} ` : ""}
              {item.price}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
