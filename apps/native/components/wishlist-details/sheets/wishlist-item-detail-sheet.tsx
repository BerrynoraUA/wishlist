import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  useSheetContentDetent,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { ItemImage } from "@/components/items/item-image";
import { ItemReportButton } from "@/components/items/item-report-button";
import { Button } from "@/components/ui/button";
import {
  ActionBottomSheetConfirm,
  type ActionBottomSheetConfirmTone,
} from "@/components/ui/action-bottom-sheet";
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
import { getLinkUrl, getValidHttpUrl } from "@/lib/urls";
import { useReportItem } from "@/hooks/use-items";
import { cn } from "@/lib/utils";
import type { Item } from "@wishlist/backend/types/item";
import * as Clipboard from "expo-clipboard";
import {
  Bookmark,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LockKeyhole,
  MoreVertical,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Linking, Pressable, View } from "react-native";

/** Enough to read what the item is; anything longer hides behind "Show more". */
const DESCRIPTION_COLLAPSED_LINES = 4;

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  isPending?: boolean;
  tone?: ActionBottomSheetConfirmTone;
  onConfirm: () => void;
};

export function WishlistItemDetailSheet({
  item,
  currentUserId,
  isOwner,
  showOwnerReservation = false,
  reservedByName,
  reservePending,
  boughtPending,
  onClose,
  onEdit,
  onDelete,
  onSaveToWishlist,
  onToggleReserve,
  onToggleBought,
}: {
  item: Item | null;
  currentUserId: string;
  isOwner: boolean;
  showOwnerReservation?: boolean;
  reservedByName?: string | null;
  reservePending?: boolean;
  boughtPending?: boolean;
  onClose: () => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onSaveToWishlist?: (item: Item) => void;
  onToggleReserve?: (itemId: string) => void;
  onToggleBought?: (itemId: string) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { detent, onContentSizeChange, onHeaderLayout } = useSheetContentDetent();
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);
  const [reserverRevealed, setReserverRevealed] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [giftMenuOpen, setGiftMenuOpen] = React.useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const [descriptionLineCount, setDescriptionLineCount] = React.useState(0);
  const reportItem = useReportItem();

  if (!item) return null;
  const selectedItem = item;

  const reservation = getItemReservationState({
    status: selectedItem.status,
    reservedBy: selectedItem.reserved_by,
    currentUserId,
  });
  const reservationLabel = buildReservationLabel(
    {
      ...reservation,
      reservedByName,
    },
    t,
    { revealName: reserverRevealed },
  );
  // Owners only see the ribbon once they opt into the spoiler — except for a reservation
  // they made themselves, which is their own doing and no surprise to spoil.
  const showStatusStamp =
    Boolean(reservationLabel) && (!isOwner || showOwnerReservation || reservation.reservedByMe);
  const canRevealReserver = showOwnerReservation && showStatusStamp && Boolean(reservedByName);
  const priorityLabel = getTranslatedItemPriorityLabel(t, selectedItem.priority_id);
  const priority = getItemPriority(selectedItem.priority_id);
  const itemUrl = getValidHttpUrl(selectedItem.url) ?? "";
  const additionalLinks = (selectedItem.additional_links ?? [])
    .map((link) => ({ ...link, url: getLinkUrl(link.url) }))
    .filter((link): link is typeof link & { url: string } => link.url !== null);
  const hasAdditionalLinks = additionalLinks.length > 0;
  const descriptionExpandable = descriptionLineCount > DESCRIPTION_COLLAPSED_LINES;
  const hasActiveDiscount = isDiscountActive(
    selectedItem.has_discount,
    selectedItem.discount_end_date,
  );
  const salePercentOff = getSalePercentOff(
    selectedItem.price,
    selectedItem.discount_price,
    hasActiveDiscount,
  );

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function confirmReservation() {
    if (!reservation.canToggleReservation || !onToggleReserve) return;

    setConfirmation({
      title: reservation.isReserved ? t("Release reservation?") : t("Reserve this gift?"),
      message: selectedItem.name,
      confirmLabel: reservation.isReserved ? t("Release") : t("Reserve"),
      isPending: reservePending,
      tone: reservation.isReserved ? "default" : "brand",
      onConfirm: () => {
        setConfirmation(null);
        onToggleReserve(selectedItem.id);
      },
    });
  }

  function confirmBought() {
    if (!reservation.canToggleBought || !onToggleBought) return;

    setConfirmation({
      title: reservation.isPurchased ? t("Mark as not purchased?") : t("Mark as purchased?"),
      message: selectedItem.name,
      confirmLabel: reservation.isPurchased ? t("Undo") : t("Buy"),
      isPending: boughtPending,
      tone: reservation.isPurchased ? "destructive" : "buy",
      onConfirm: () => {
        setConfirmation(null);
        onToggleBought(selectedItem.id);
      },
    });
  }

  function openLink(url: string | null) {
    if (!url) return;
    void Linking.openURL(url);
  }

  async function copyLink(url: string | null) {
    const link = url?.trim();
    if (!link) return;
    await Clipboard.setStringAsync(link);
  }

  // Actions stay visible but are locked when the viewer can't perform them. "Undo" only
  // appears for a purchase this viewer made — someone else's purchase shows a locked "Buy".
  const canReserve = reservation.canToggleReservation;
  const canBuy = reservation.canToggleBought;
  const canUndoPurchase = reservation.isPurchased && canBuy;
  const reservedByMe = reservation.isReserved && reservation.reservedByMe;
  // A purchased gift is reserved too, so both buttons report the state they are locked in.
  const showAsReserved = reservation.isReserved || reservation.isPurchased;
  const ownerActions = isOwner ? Boolean(onEdit) || Boolean(onDelete) : false;
  // Saving a copy of the item to your own wishlist stays pointless on a list you own.
  const guestActions = !isOwner && Boolean(onSaveToWishlist);
  const hasActions = ownerActions || guestActions || itemUrl.length > 0;
  // Reserve and buy are for everyone, the owner included, but they read as secondary to
  // edit and delete — they live in the overflow menu on the image, not in the footer.
  const hasGiftActions = Boolean(onToggleReserve) || Boolean(onToggleBought);

  const giftActionsTrigger = hasGiftActions ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Gift actions")}
      accessibilityState={{ expanded: giftMenuOpen }}
      hitSlop={8}
      onPress={() => setGiftMenuOpen((open) => !open)}
      className="size-9 items-center justify-center rounded-full border border-border-subtle bg-card-bg shadow-sm"
    >
      <Icon as={MoreVertical} className="size-5 text-text-muted" />
    </Pressable>
  ) : null;

  // Laid out inside the sheet rather than portalled: a portalled menu is positioned from a
  // window measurement, and the sheet presents in its own native container, so the menu
  // would land near the top of the screen and drift again whenever the sheet resizes.
  // Anchored to the trigger's own box instead, it stays under the dots at any sheet height.
  const giftActionsMenu = !giftMenuOpen ? null : (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Close menu")}
        onPress={() => setGiftMenuOpen(false)}
        className="absolute inset-0"
      />
      <View className="absolute start-3 top-14 min-w-56 rounded-xl border border-border bg-card-bg p-1 shadow-xl shadow-black/15">
        {onToggleReserve ? (
          <Pressable
            accessibilityRole="menuitem"
            disabled={!canReserve || reservePending}
            onPress={() => {
              setGiftMenuOpen(false);
              confirmReservation();
            }}
            className={cn(
              "min-h-11 flex-row items-center gap-3 rounded-lg px-3 py-2 active:bg-bg-muted",
              (!canReserve || reservePending) && "opacity-50",
            )}
          >
            <Icon as={LockKeyhole} className="size-4 text-brand" />
            <Text className="text-sm text-brand">
              {reservedByMe
                ? t("Release reservation")
                : showAsReserved
                  ? t("Reserved")
                  : t("Reserve this gift")}
            </Text>
          </Pressable>
        ) : null}
        {onToggleBought ? (
          <Pressable
            accessibilityRole="menuitem"
            disabled={!canBuy || boughtPending}
            onPress={() => {
              setGiftMenuOpen(false);
              confirmBought();
            }}
            className={cn(
              "min-h-11 flex-row items-center gap-3 rounded-lg px-3 py-2 active:bg-bg-muted",
              (!canBuy || boughtPending) && "opacity-50",
            )}
          >
            <Icon
              as={ShoppingCart}
              className={canUndoPurchase ? "size-4 text-destructive" : "size-4 text-buy"}
            />
            <Text className={cn("text-sm", canUndoPurchase ? "text-destructive" : "text-buy")}>
              {canUndoPurchase ? t("Undo") : reservation.isPurchased ? t("Purchased") : t("Buy")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const actions = !hasActions ? null : (
    <View className="w-full gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
      {/* Pinned rather than scrolled away: the store link is the one action a long
          description would otherwise bury. */}
      {itemUrl ? (
        <View className="flex-row gap-2">
          <Button
            variant="ghost"
            size="lg"
            onPress={() => openLink(itemUrl)}
            className="min-w-0 flex-1 justify-start"
          >
            <Icon as={ExternalLink} className="size-4 text-text" />
            <Text numberOfLines={1}>{t("Go to store")}</Text>
          </Button>
          <Button
            variant="outline"
            size="icon"
            accessibilityLabel={t("Copy link")}
            onPress={() => void copyLink(itemUrl)}
          >
            <Icon as={Copy} className="size-4 text-text" />
          </Button>
        </View>
      ) : null}
      {isOwner ? (
        <View className="flex-row gap-2">
          {onEdit ? (
            <Button
              className="min-w-0 flex-1"
              onPress={() => {
                onEdit(selectedItem);
                handleClose();
              }}
            >
              <Icon as={Pencil} className="size-4 text-primary-foreground" />
              <Text>{t("Edit")}</Text>
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="destructive"
              className="min-w-0 flex-1"
              onPress={() => {
                onDelete(selectedItem);
                handleClose();
              }}
            >
              <Icon as={Trash2} className="size-4 text-white" />
              <Text>{t("Delete")}</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
      {!isOwner && onSaveToWishlist ? (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onPress={() => {
            onSaveToWishlist(selectedItem);
            handleClose();
          }}
        >
          <Icon as={Bookmark} className="size-4 text-text" />
          <Text>{t("Save to wishlist")}</Text>
        </Button>
      ) : null}
    </View>
  );

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        scrollable
        // A single detent measured from the content keeps the sheet as tall as the item —
        // no empty gap under a short one — and caps at nearly full screen, where it scrolls.
        detents={[detent]}
        footerInsetMode="scroll-content"
        onDidDismiss={onClose}
        header={
          <View onLayout={onHeaderLayout}>
            <BottomSheetHeader title={t("Item details")} />
          </View>
        }
        footer={actions ?? undefined}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5"
          onContentSizeChange={onContentSizeChange}
        >
          <View className="relative gap-5">
            <ItemImage
              item={item}
              reservationLabel={showStatusStamp ? reservationLabel : null}
              stampLabel={reserverRevealed ? reservedByName : null}
              overlayAction={
                giftActionsTrigger || canRevealReserver ? (
                  <View className="flex-row items-center gap-2">
                    {giftActionsTrigger}
                    {canRevealReserver ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          reserverRevealed
                            ? t("Hide who reserved this")
                            : t("Show who reserved this")
                        }
                        onPress={() => setReserverRevealed((value) => !value)}
                        hitSlop={8}
                        className="size-9 items-center justify-center rounded-full border border-border-subtle bg-card-bg shadow-sm"
                      >
                        <Icon
                          as={reserverRevealed ? EyeOff : Eye}
                          className="size-5 text-text-muted"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null
              }
              purchased={reservation.isPurchased}
              priority={priority}
              priorityLabel={priorityLabel}
              salePercentOff={salePercentOff}
              showDiscountPrice={hasActiveDiscount}
              endAction={isOwner ? null : <ItemReportButton onPress={() => setReportOpen(true)} />}
              size="detail"
            />

            <View className="gap-3">
              <Text className="text-2xl font-extrabold leading-7 text-text">{item.name}</Text>

              {item.description ? (
                <View className="gap-1">
                  {/* Measured off-layout, because a Text that already carries
                      `numberOfLines` reports only the lines it kept — the toggle could
                      never tell a clipped description from a short one. */}
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className="text-sm leading-6 text-text-muted"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                    onTextLayout={(event) =>
                      setDescriptionLineCount(event.nativeEvent.lines.length)
                    }
                  >
                    {item.description}
                  </Text>
                  <Text
                    className="text-sm leading-6 text-text-muted"
                    numberOfLines={descriptionExpanded ? undefined : DESCRIPTION_COLLAPSED_LINES}
                  >
                    {item.description}
                  </Text>
                  {descriptionExpandable ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => setDescriptionExpanded((expanded) => !expanded)}
                      className="self-start py-1"
                    >
                      <Text className="text-sm font-bold text-brand">
                        {descriptionExpanded ? t("Show less") : t("Show more")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            {hasAdditionalLinks ? (
              <View className="gap-2">
                {additionalLinks.map((link, index) => (
                  <View key={`${link.url}-${index}`} className="flex-row gap-2">
                    <Button
                      variant="outline"
                      onPress={() => openLink(link.url)}
                      className="min-w-0 flex-1 justify-start"
                    >
                      <Icon as={ExternalLink} className="size-4 text-text" />
                      <Text numberOfLines={1}>
                        {link.title || getItemStoreFromUrl(link.url) || t("Link")}
                      </Text>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      accessibilityLabel={t("Copy link")}
                      onPress={() => void copyLink(link.url)}
                    >
                      <Icon as={Copy} className="size-4 text-text" />
                    </Button>
                  </View>
                ))}
              </View>
            ) : null}

            {giftActionsMenu}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
      <ActionBottomSheetConfirm
        open={reportOpen}
        title={t("Report this item?")}
        message={t("Our team will take a look. You can only report an item once.")}
        confirmLabel={t("Report")}
        isPending={reportItem.isPending}
        tone="destructive"
        onClose={() => setReportOpen(false)}
        onConfirm={() => {
          reportItem.mutate(selectedItem.id, {
            onSettled: () => setReportOpen(false),
          });
        }}
      />
      <ActionBottomSheetConfirm
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? ""}
        isPending={confirmation?.isPending}
        tone={confirmation?.tone}
        onClose={() => setConfirmation(null)}
        onConfirm={() => confirmation?.onConfirm()}
      />
    </>
  );
}
