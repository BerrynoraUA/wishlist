import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ItemImage } from "@/components/items/item-image";
import { ItemPriorityMedallion, useItemCardBorderStyle } from "@/components/items/item-labels";
import { ActionBottomSheetConfirm } from "@/components/ui/action-bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useDropdownMenuPreview,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemPriority,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
  isDiscountActive,
} from "@/lib/items";
import { hapticToggle } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { getValidHttpUrl } from "@/lib/urls";
import { isStarPriorityId } from "@wishlist/backend/lib";
import type { Item } from "@wishlist/backend/types/item";
import * as Clipboard from "expo-clipboard";
import {
  Copy,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function WishlistItemCard({
  item,
  width,
  currentUserId,
  isOwner,
  showDiscountBadge,
  showOwnerReservation = false,
  reservedByName,
  voteCount,
  hasVoted,
  onPress,
  onEdit,
  onDelete,
  onToggleVote,
  onToggleReserve,
  onToggleBought,
  reservePending = false,
  boughtPending = false,
}: {
  item: Item;
  width: number;
  currentUserId: string;
  isOwner: boolean;
  showDiscountBadge: boolean;
  showOwnerReservation?: boolean;
  reservedByName?: string | null;
  voteCount: number;
  hasVoted: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVote?: () => void;
  onToggleReserve?: () => void;
  onToggleBought?: () => void;
  reservePending?: boolean;
  boughtPending?: boolean;
}) {
  const t = useGT();
  const [reserverRevealed, setReserverRevealed] = React.useState(false);
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
    { revealName: reserverRevealed },
  );
  // Owners never see reservation status on their own wishlist (keep the
  // surprise). For everyone else, gray out reserved/purchased items so they
  // read as "taken" at a glance; purchases use the image ribbon only.
  // Owners only see the ribbon once they opt into the spoiler.
  const isTaken = Boolean(reservationLabel) && (!isOwner || showOwnerReservation);
  const canRevealReserver = showOwnerReservation && isTaken && Boolean(reservedByName);
  const priorityLabel = getTranslatedItemPriorityLabel(t, item.priority_id);
  const priority = getItemPriority(item.priority_id);
  const cardBorderStyle = useItemCardBorderStyle(priority);
  const store = getItemStoreFromUrl(item.url);
  const itemUrl = getValidHttpUrl(item.url) ?? "";
  const showCopyLink = itemUrl.length > 0;
  const hasWebsiteLink = Boolean(store);
  const showMenu = Boolean(showCopyLink || (isOwner && (onEdit || onDelete)));
  const hasActiveDiscount = isDiscountActive(item.has_discount, item.discount_end_date);
  const salePercentOff = getSalePercentOff(
    item.price,
    item.discount_price,
    showDiscountBadge && hasActiveDiscount,
  );
  const canReserve = !isOwner && Boolean(onToggleReserve && reservation.canToggleReservation);
  const canBuy = !isOwner && Boolean(onToggleBought && reservation.canToggleBought);
  const menuPreview = useDropdownMenuPreview();
  const [reservationConfirmationOpen, setReservationConfirmationOpen] = React.useState(false);
  const [purchaseConfirmationOpen, setPurchaseConfirmationOpen] = React.useState(false);

  async function handleCopyLink() {
    if (!itemUrl) return;
    await Clipboard.setStringAsync(itemUrl);
  }

  function confirmBought() {
    if (!reservation.canToggleBought || !onToggleBought) return;
    setPurchaseConfirmationOpen(true);
  }

  function confirmReservation() {
    if (!reservation.canToggleReservation || !onToggleReserve) return;
    setReservationConfirmationOpen(true);
  }

  return (
    <View style={{ width }}>
      <DropdownMenu className="relative" onOpenChange={menuPreview.onOpenChange}>
        <View ref={menuPreview.cardRef} collapsable={false}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t('Open "{name}"', { name: item.name })}
            onPress={onPress}
            onLongPress={showMenu ? menuPreview.openMenu : undefined}
            pressedScale={isTaken ? 1 : 0.98}
            className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
            // The priority is what tints the card — no separate item colour.
            style={cardBorderStyle}
          >
            <ItemImage
              item={item}
              reservationLabel={isTaken ? reservationLabel : null}
              stampLabel={reserverRevealed ? reservedByName : null}
              overlayAction={
                canRevealReserver ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      reserverRevealed ? t("Hide who reserved this") : t("Show who reserved this")
                    }
                    onPress={(event) => {
                      event.stopPropagation();
                      setReserverRevealed((value) => !value);
                    }}
                    hitSlop={8}
                    className="size-9 items-center justify-center rounded-full border border-border-subtle bg-card-bg shadow-sm"
                  >
                    <Icon as={reserverRevealed ? EyeOff : Eye} className="size-5 text-text-muted" />
                  </AnimatedPressable>
                ) : null
              }
              purchased={reservation.isPurchased}
              priority={priority}
              priorityLabel={priorityLabel}
              salePercentOff={salePercentOff}
              showDiscountPrice={hasActiveDiscount}
              size="card"
            />
            <View className="gap-2 p-3">
              <View className="gap-0.5">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={cn(
                      "min-w-0 flex-1 text-sm font-extrabold text-text",
                      isTaken && "opacity-50",
                    )}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {!isOwner && onToggleVote ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={hasVoted ? t("Remove vote") : t("Vote for item")}
                      onPress={(event) => {
                        event.stopPropagation();
                        hapticToggle(!hasVoted);
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
                        className={cn(
                          "text-xs font-bold",
                          hasVoted ? "text-brand" : "text-text-muted",
                        )}
                      >
                        {voteCount}
                      </Text>
                    </AnimatedPressable>
                  ) : null}
                </View>
                {hasWebsiteLink ? (
                  <View className="flex-row items-center justify-between gap-2">
                    {store ? (
                      <Text
                        className={cn(
                          "min-w-0 flex-1 text-xs font-semibold text-text-muted",
                          isTaken && "opacity-50",
                        )}
                        numberOfLines={1}
                      >
                        {store}
                      </Text>
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>
                ) : null}
              </View>

              {canReserve || canBuy ? (
                <View className="flex-row gap-2">
                  {canReserve ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        reservation.isReserved ? t("Release reservation") : t("Reserve this gift")
                      }
                      disabled={reservePending}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmReservation();
                      }}
                      className={cn(
                        "min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3",
                        reservation.isReserved
                          ? "border-brand bg-brand"
                          : "border-brand/25 bg-brand-lighter",
                      )}
                    >
                      <Icon
                        as={LockKeyhole}
                        className={cn(
                          "size-4",
                          reservation.isReserved ? "text-primary-foreground" : "text-brand",
                        )}
                      />
                      <Text
                        numberOfLines={1}
                        className={cn(
                          "text-sm font-extrabold",
                          reservation.isReserved ? "text-primary-foreground" : "text-brand",
                        )}
                      >
                        {reservation.isReserved ? t("Release") : t("Reserve")}
                      </Text>
                    </AnimatedPressable>
                  ) : null}

                  {canBuy ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        reservation.isPurchased
                          ? t("Mark as not purchased")
                          : t("Mark as purchased")
                      }
                      disabled={boughtPending}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmBought();
                      }}
                      className={cn(
                        "min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3",
                        reservation.isPurchased
                          ? "border-destructive/35 bg-danger-bg"
                          : "border-buy/35 bg-buy-bg",
                      )}
                    >
                      <Icon
                        as={ShoppingCart}
                        className={cn(
                          "size-4",
                          reservation.isPurchased ? "text-destructive" : "text-buy",
                        )}
                      />
                      <Text
                        numberOfLines={1}
                        className={cn(
                          "text-sm font-extrabold",
                          reservation.isPurchased ? "text-destructive" : "text-buy",
                        )}
                      >
                        {reservation.isPurchased ? t("Undo") : t("Buy")}
                      </Text>
                    </AnimatedPressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </AnimatedPressable>

          {/* Hangs off the bottom edge, centred — same placement as the web card.
              It sits outside the pressable, which clips its own overflow. */}
          {priority && isStarPriorityId(priority.id) ? (
            <View className="absolute inset-x-0 -bottom-3.5 z-10 items-center" pointerEvents="none">
              <ItemPriorityMedallion priority={priority} label={priorityLabel} />
            </View>
          ) : null}
        </View>
        {showMenu ? (
          <DropdownMenuTrigger asChild>
            <AnimatedPressable
              ref={menuPreview.triggerRef}
              pointerEvents="none"
              className="absolute inset-0 opacity-0"
            />
          </DropdownMenuTrigger>
        ) : null}
        <DropdownMenuContent backdrop="blur" preview={menuPreview.preview} sideOffset={10}>
          {showCopyLink ? (
            <DropdownMenuItem layout="action" onPress={handleCopyLink}>
              <Text className="flex-1">{t("Copy link")}</Text>
              <Icon as={Copy} className="ms-auto size-4 text-text-muted" />
            </DropdownMenuItem>
          ) : null}
          {onEdit ? (
            <DropdownMenuItem layout="action" onPress={onEdit}>
              <Text className="flex-1">{t("Edit")}</Text>
              <Icon as={Pencil} className="ms-auto size-4 text-text-muted" />
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem layout="action" variant="destructive" onPress={onDelete}>
              <Text className="flex-1">{t("Delete")}</Text>
              <Icon as={Trash2} className="ms-auto size-4 text-destructive" />
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionBottomSheetConfirm
        open={reservationConfirmationOpen}
        title={reservation.isReserved ? t("Release reservation?") : t("Reserve this gift?")}
        message={item.name}
        confirmLabel={reservation.isReserved ? t("Release") : t("Reserve")}
        isPending={reservePending}
        tone={reservation.isReserved ? "default" : "brand"}
        onClose={() => setReservationConfirmationOpen(false)}
        onConfirm={() => {
          setReservationConfirmationOpen(false);
          onToggleReserve?.();
        }}
      />
      <ActionBottomSheetConfirm
        open={purchaseConfirmationOpen}
        title={reservation.isPurchased ? t("Mark as not purchased?") : t("Mark as purchased?")}
        message={item.name}
        confirmLabel={reservation.isPurchased ? t("Undo") : t("Buy")}
        isPending={boughtPending}
        tone={reservation.isPurchased ? "destructive" : "buy"}
        onClose={() => setPurchaseConfirmationOpen(false)}
        onConfirm={() => {
          setPurchaseConfirmationOpen(false);
          onToggleBought?.();
        }}
      />
    </View>
  );
}
