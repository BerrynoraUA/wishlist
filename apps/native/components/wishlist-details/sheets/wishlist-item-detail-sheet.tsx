import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ActionBottomSheetConfirm } from "@/components/ui/action-bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { ItemDetailStatusBadge, ItemPriorityBadge } from "@/components/items/item-labels";
import {
  buildReservationLabel,
  getItemPriority,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
  isDiscountActive,
} from "@/lib/items";
import type { Item } from "@wishlist/backend/types/item";
import * as Clipboard from "expo-clipboard";
import {
  Copy,
  ExternalLink,
  Gift,
  LockKeyhole,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Linking, Platform, View } from "react-native";

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
};

export function WishlistItemDetailSheet({
  item,
  currentUserId,
  isOwner,
  reservedByName,
  reservePending,
  boughtPending,
  onClose,
  onEdit,
  onDelete,
  onToggleReserve,
  onToggleBought,
}: {
  item: Item | null;
  currentUserId: string;
  isOwner: boolean;
  reservedByName?: string | null;
  reservePending?: boolean;
  boughtPending?: boolean;
  onClose: () => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onToggleReserve?: (itemId: string) => void;
  onToggleBought?: (itemId: string) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);

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
  );
  const priorityLabel = getTranslatedItemPriorityLabel(t, selectedItem.priority_id);
  const priority = getItemPriority(selectedItem.priority_id);
  const store = getItemStoreFromUrl(selectedItem.url);
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
      confirmLabel: reservation.isPurchased ? t("Undo") : t("Bought"),
      isPending: boughtPending,
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

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        detents={["auto"]}
        dismissOnBack={false}
        onDidDismiss={onClose}
        header={
          <Text className="mx-5 mt-5 text-2xl font-extrabold leading-7 text-text">{item.name}</Text>
        }
      >
        {/* iOS sheets add their own bottom safe-area inset; only Android needs the extra padding. */}
        <View className={`gap-5 px-5 pt-5 ${Platform.OS === "ios" ? "pb-0" : "pb-4"}`}>
          <View className="h-56 overflow-hidden rounded-2xl border border-border-subtle bg-bg-muted">
            {item.image_url ? (
              <StyledImage
                source={{ uri: item.image_url }}
                contentFit="cover"
                className="size-full"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Icon as={Gift} className="size-12 text-text-light" />
              </View>
            )}
          </View>

          <View className="gap-3">
            {item.description ? (
              <Text className="text-sm leading-6 text-text-muted">{item.description}</Text>
            ) : null}

            <View className="flex-row flex-wrap gap-2">
              {item.price ? (
                hasActiveDiscount && item.discount_price ? (
                  <View className="flex-row items-center gap-2 rounded-full bg-brand-lighter px-3 py-1.5">
                    <Text className="text-sm font-extrabold text-brand">
                      {item.currency ? `${item.currency} ` : ""}
                      {item.discount_price}
                    </Text>
                    <Text className="text-xs font-bold text-text-muted line-through">
                      {item.currency ? `${item.currency} ` : ""}
                      {item.price}
                    </Text>
                  </View>
                ) : (
                  <Text className="rounded-full bg-brand-lighter px-3 py-1.5 text-sm font-extrabold text-brand">
                    {item.currency ? `${item.currency} ` : ""}
                    {item.price}
                  </Text>
                )
              ) : null}
              {salePercentOff != null ? (
                <Text className="rounded-full bg-danger px-3 py-1.5 text-sm font-extrabold text-white">
                  {t("Sale -{percent}%", { percent: salePercentOff })}
                </Text>
              ) : null}
              {priority && priorityLabel ? (
                <ItemPriorityBadge priority={priority} label={priorityLabel} />
              ) : null}
              {!isOwner && reservationLabel ? (
                <ItemDetailStatusBadge
                  label={reservationLabel}
                  purchased={reservation.isPurchased}
                />
              ) : null}
            </View>
          </View>

          {item.url || item.additional_links?.length ? (
            <View className="gap-2">
              {item.url ? (
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    onPress={() => openLink(item.url)}
                    className="min-w-0 flex-1 justify-start"
                  >
                    <Icon as={ExternalLink} className="size-4 text-text" />
                    <Text numberOfLines={1}>{store || t("Visit website")}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    accessibilityLabel={t("Copy link")}
                    onPress={() => void copyLink(item.url)}
                  >
                    <Icon as={Copy} className="size-4 text-text" />
                  </Button>
                </View>
              ) : null}
              {item.additional_links?.map((link, index) => (
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

          <View className="gap-2">
            {isOwner ? (
              <View className="flex-row gap-2">
                {onEdit ? (
                  <Button
                    className="min-w-0 flex-1"
                    onPress={() => {
                      onEdit(item);
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
                      onDelete(item);
                      handleClose();
                    }}
                  >
                    <Icon as={Trash2} className="size-4 text-white" />
                    <Text>{t("Delete")}</Text>
                  </Button>
                ) : null}
              </View>
            ) : (
              <View className="gap-2">
                {onToggleReserve ? (
                  <Button
                    variant="outline"
                    disabled={!reservation.canToggleReservation || reservePending}
                    onPress={confirmReservation}
                    className={
                      reservation.isReserved
                        ? "border-brand bg-brand"
                        : "border-brand/25 bg-brand-lighter"
                    }
                  >
                    {reservePending ? (
                      <ActivityIndicator colorClassName="accent-primary-foreground" />
                    ) : null}
                    <Icon
                      as={LockKeyhole}
                      className={
                        reservation.isReserved
                          ? "size-4 text-primary-foreground"
                          : "size-4 text-brand"
                      }
                    />
                    <Text
                      className={reservation.isReserved ? "text-primary-foreground" : "text-brand"}
                    >
                      {!reservation.isReserved
                        ? t("Reserve this gift")
                        : reservation.reservedByMe
                          ? t("Release reservation")
                          : t("Reserved")}
                    </Text>
                  </Button>
                ) : null}
                {onToggleBought ? (
                  <Button
                    variant="outline"
                    disabled={!reservation.canToggleBought || boughtPending}
                    onPress={confirmBought}
                    className={
                      reservation.isPurchased
                        ? "border-[#15803d] bg-[#16a34a1f]"
                        : "border-border-subtle bg-card-bg"
                    }
                  >
                    {boughtPending ? (
                      <ActivityIndicator colorClassName="accent-primary-foreground" />
                    ) : null}
                    <Icon
                      as={ShoppingCart}
                      className="size-4"
                      color={reservation.isPurchased ? "#15803d" : undefined}
                    />
                    <Text style={reservation.isPurchased ? { color: "#15803d" } : undefined}>
                      {reservation.isPurchased ? t("Purchased") : t("Bought")}
                    </Text>
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </BottomSheet>
      <ActionBottomSheetConfirm
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? ""}
        isPending={confirmation?.isPending}
        onClose={() => setConfirmation(null)}
        onConfirm={() => confirmation?.onConfirm()}
      />
    </>
  );
}
