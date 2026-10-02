import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { CARD_BADGE_HEIGHT, ItemPriorityBadge } from "@/components/items/item-labels";
import { ItemRibbon, type ItemRibbonPhase } from "@/components/items/item-ribbon";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isStarPriorityId } from "@wishlist/backend/lib";
import type { Item } from "@wishlist/backend/types/item";
import { Gift } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const TAKEN_IMAGE_OPACITY = 0.4;

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
  const reduceMotion = useReducedMotion();
  const isDetail = size === "detail";
  const isTaken = Boolean(reservationLabel);
  const status = isTaken ? (purchased ? "purchased" : "reserved") : "none";
  const label = stampLabel ?? (purchased ? t("Purchased") : t("Reserved"));
  const isStamp = Boolean(stampLabel);

  // Animate only a real change on the same item: lists recycle this view across items, and an
  // item that was already taken when it scrolled in should just show its sash.
  const [previous, setPrevious] = React.useState({ id: item.id, status, label, isStamp });
  const [ribbonKey, setRibbonKey] = React.useState(0);
  const [ribbonPhase, setRibbonPhase] = React.useState<ItemRibbonPhase>("static");
  const [leaving, setLeaving] = React.useState<{
    purchased: boolean;
    label: string;
    isStamp: boolean;
  } | null>(null);
  if (
    previous.id !== item.id ||
    previous.status !== status ||
    previous.label !== label ||
    previous.isStamp !== isStamp
  ) {
    const statusChanged = previous.id === item.id && previous.status !== status;
    setPrevious({ id: item.id, status, label, isStamp });

    if (previous.id !== item.id || statusChanged) {
      const animate = statusChanged && !reduceMotion;
      setLeaving(
        animate && status === "none"
          ? {
              purchased: previous.status === "purchased",
              label: previous.label,
              isStamp: previous.isStamp,
            }
          : null,
      );
      setRibbonPhase(animate && status !== "none" ? "enter" : "static");
      setRibbonKey((key) => key + 1);
    }
  }

  const dim = useSharedValue(isTaken ? TAKEN_IMAGE_OPACITY : 1);
  React.useEffect(() => {
    const target = isTaken ? TAKEN_IMAGE_OPACITY : 1;
    const animate = ribbonPhase === "enter" || leaving != null;
    dim.value = animate ? withTiming(target, { duration: 420 }) : target;
    // Re-run per status change only; `ribbonKey` bumps exactly then.
  }, [ribbonKey]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  return (
    <View
      className={cn(
        // Square in both sizes so the detail sheet shows the image at the same height as
        // the card in the list, instead of cropping it into a short strip.
        "relative aspect-square items-center justify-center overflow-hidden bg-bg-muted",
        isDetail ? "rounded-2xl border border-border-subtle" : "w-full min-h-0 rounded-t-xl",
      )}
    >
      {item.image_url ? (
        <Animated.View className="absolute inset-0" style={dimStyle}>
          <StyledImage
            source={{ uri: item.image_url }}
            contentFit="cover"
            contentPosition="center"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            className="size-full"
          />
        </Animated.View>
      ) : (
        <Animated.View style={dimStyle}>
          <Icon
            as={Gift}
            className={isDetail ? "size-12 text-text-light" : "size-10 text-text-light"}
          />
        </Animated.View>
      )}

      {isTaken ? (
        <ItemRibbon
          key={ribbonKey}
          purchased={purchased}
          label={label}
          isStamp={isStamp}
          isDetail={isDetail}
          phase={ribbonPhase}
        />
      ) : leaving ? (
        <ItemRibbon
          key={ribbonKey}
          purchased={leaving.purchased}
          label={leaving.label}
          isStamp={leaving.isStamp}
          isDetail={isDetail}
          phase="exit"
          onExited={() => setLeaving(null)}
        />
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
        {/* Starred already reads from the card behind the sheet, and its medallion
            used to sit right below — no need to repeat it in the detail hero. */}
        {priority && priorityLabel && !(isDetail && isStarPriorityId(priority.id)) ? (
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
