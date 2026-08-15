import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import {
  CARD_BADGE_HEIGHT,
  ItemPriorityBadge,
  ItemPriorityMedallion,
} from "@/components/items/item-labels";
import { cn } from "@/lib/utils";
import { isStarPriorityId } from "@wishlist/backend/lib";
import type { Item } from "@wishlist/backend/types/item";
import { Gift } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function ItemImage({
  item,
  reservationLabel,
  stampLabel,
  overlayAction,
  purchased,
  priority,
  priorityLabel,
  salePercentOff,
  showDiscountPrice,
  size,
}: {
  item: Item;
  reservationLabel?: string | null;
  /** Overrides the ribbon text, e.g. with a revealed reserver name. */
  stampLabel?: string | null;
  /** Control pinned to the top-start corner, e.g. the reveal toggle. */
  overlayAction?: React.ReactNode;
  purchased: boolean;
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
        // Square in both sizes so the detail sheet shows the image at the same height as
        // the card in the list, instead of cropping it into a short strip.
        "relative aspect-square items-center justify-center overflow-hidden bg-bg-muted",
        isDetail ? "rounded-2xl border border-border-subtle" : "w-full min-h-0",
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
              numberOfLines={1}
              className={cn(
                "font-extrabold",
                // Purchased reads green; reserved keeps the brand colour.
                purchased ? "text-[#86efac]" : "text-brand",
                stampLabel ? "px-3 text-sm" : "uppercase tracking-widest",
                !stampLabel && (isDetail ? "text-xl" : "text-lg"),
              )}
            >
              {stampLabel ?? (purchased ? t("Purchased") : t("Reserved"))}
            </Text>
          </View>
        </View>
      ) : null}

      {overlayAction ? (
        <View className={cn("absolute z-10", isDetail ? "start-3 top-3" : "start-2 top-2")}>
          {overlayAction}
        </View>
      ) : null}

      <View
        className={cn(
          "absolute end-2 top-2 z-10 items-end gap-1.5",
          isDetail && "end-3 top-3 max-w-[45%]",
        )}
      >
        {salePercentOff != null ? (
          <View
            className="items-center justify-center rounded-full border border-danger bg-danger-bg px-2.5"
            style={{ height: CARD_BADGE_HEIGHT }}
          >
            <Text className="text-[11px] font-extrabold text-danger">
              {t("Sale -{percent}%", { percent: salePercentOff })}
            </Text>
          </View>
        ) : null}
        {priority && priorityLabel ? (
          <ItemPriorityBadge priority={priority} label={priorityLabel} compact context="card" />
        ) : null}
      </View>

      {/* Only Stare gets a medallion, and on a card it hangs off the bottom edge
          of the whole card (see the card components) — here it shows in the
          detail sheet, where the image is the full-width hero. */}
      {priority && isDetail && isStarPriorityId(priority.id) ? (
        <View className="absolute inset-x-0 bottom-3 z-10 items-center">
          <ItemPriorityMedallion priority={priority} label={priorityLabel} size="detail" />
        </View>
      ) : null}

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
