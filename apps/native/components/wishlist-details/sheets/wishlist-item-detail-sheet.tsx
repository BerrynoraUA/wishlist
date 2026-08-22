import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
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
import type { Item } from "@wishlist/backend/types/item";
import * as Clipboard from "expo-clipboard";
import {
  Bookmark,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LockKeyhole,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";

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
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);
  const [reserverRevealed, setReserverRevealed] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const reportItem = useReportItem();

  if (!item) return null;
  const selectedItem = item;

  const reservation = getItemReservationState({
    status: selectedItem.status,
    reservedBy: selectedItem.reserved_by,
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
  // Owners only see the ribbon once they opt into the spoiler.
  const showStatusStamp = Boolean(reservationLabel) && (!isOwner || showOwnerReservation);
  const canRevealReserver = showOwnerReservation && showStatusStamp && Boolean(reservedByName);
  const priorityLabel = getTranslatedItemPriorityLabel(t, selectedItem.priority_id);
  const priority = getItemPriority(selectedItem.priority_id);
  const store = getItemStoreFromUrl(selectedItem.url);
  const itemUrl = getValidHttpUrl(selectedItem.url) ?? "";
  const additionalLinks = (selectedItem.additional_links ?? [])
    .map((link) => ({ ...link, url: getLinkUrl(link.url) }))
    .filter((link): link is typeof link & { url: string } => link.url !== null);
  const hasLinks = itemUrl.length > 0 || additionalLinks.length > 0;
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
  const guestActions =
    !isOwner && (Boolean(onSaveToWishlist) || Boolean(onToggleReserve) || Boolean(onToggleBought));
  const hasActions = ownerActions || guestActions;

  const actions = !hasActions ? null : (
    <View className="w-full gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
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
      ) : (
        <>
          {onSaveToWishlist ? (
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
          {onToggleReserve ? (
            <Button
              variant="ghost"
              size="lg"
              disabled={!canReserve || reservePending}
              onPress={confirmReservation}
              className={
                reservedByMe
                  ? "w-full rounded-lg border border-brand bg-brand"
                  : "w-full rounded-lg border border-brand/25 bg-brand-lighter"
              }
            >
              {reservePending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Icon
                as={LockKeyhole}
                className={reservedByMe ? "size-4 text-primary-foreground" : "size-4 text-brand"}
              />
              <Text className={reservedByMe ? "text-primary-foreground" : "text-brand"}>
                {reservedByMe
                  ? t("Release reservation")
                  : showAsReserved
                    ? t("Reserved")
                    : t("Reserve this gift")}
              </Text>
            </Button>
          ) : null}
          {onToggleBought ? (
            <Button
              variant="ghost"
              size="lg"
              disabled={!canBuy || boughtPending}
              onPress={confirmBought}
              className={
                canUndoPurchase
                  ? "w-full rounded-lg border border-destructive/35 bg-danger-bg"
                  : "w-full rounded-xl border border-buy/70 bg-buy-bg"
              }
            >
              {boughtPending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Icon
                as={ShoppingCart}
                className={canUndoPurchase ? "size-4 text-destructive" : "size-4 text-buy"}
              />
              <Text className={canUndoPurchase ? "text-destructive" : "text-buy"}>
                {canUndoPurchase ? t("Undo") : reservation.isPurchased ? t("Purchased") : t("Buy")}
              </Text>
            </Button>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        scrollable
        // "auto" keeps the sheet as tall as its content — no empty gap under a short item —
        // and only starts scrolling once the content outgrows the screen.
        detents={["auto", 0.94]}
        footerInsetMode="scroll-content"
        onDidDismiss={onClose}
        header={<BottomSheetHeader title={t("Item details")} />}
        footer={actions ?? undefined}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-5"
        >
          <ItemImage
            item={item}
            reservationLabel={showStatusStamp ? reservationLabel : null}
            stampLabel={reserverRevealed ? reservedByName : null}
            overlayAction={
              canRevealReserver ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    reserverRevealed ? t("Hide who reserved this") : t("Show who reserved this")
                  }
                  onPress={() => setReserverRevealed((value) => !value)}
                  hitSlop={8}
                  className="size-9 items-center justify-center rounded-full border border-border-subtle bg-card-bg shadow-sm"
                >
                  <Icon as={reserverRevealed ? EyeOff : Eye} className="size-5 text-text-muted" />
                </Pressable>
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
              <Text className="text-sm leading-6 text-text-muted">{item.description}</Text>
            ) : null}
          </View>

          {hasLinks ? (
            <View className="gap-2">
              {itemUrl ? (
                <View className="flex-row gap-2">
                  <Button
                    variant="ghost"
                    size="lg"
                    onPress={() => openLink(itemUrl)}
                    className="min-w-0 flex-1 justify-start"
                  >
                    <Icon as={ExternalLink} className="size-4 text-text" />
                    <Text numberOfLines={1}>{store || t("Visit website")}</Text>
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
          reportItem.mutate(selectedItem.id, { onSettled: () => setReportOpen(false) });
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
