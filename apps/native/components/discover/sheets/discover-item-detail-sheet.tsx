import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { ItemImage } from "@/components/items/item-image";
import {
  ActionBottomSheetConfirm,
  type ActionBottomSheetConfirmTone,
} from "@/components/ui/action-bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemPriority,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
} from "@/lib/items";
import { getValidHttpUrl } from "@/lib/urls";
import type { Item } from "@wishlist/backend/types/item";
import { Copy, ExternalLink, LockKeyhole, ShoppingCart } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Linking, View } from "react-native";

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  isPending?: boolean;
  tone?: ActionBottomSheetConfirmTone;
  onConfirm: () => void;
};

export function DiscoverItemDetailSheet({
  item,
  reservedByName,
  currentUserId,
  reservePending,
  boughtPending,
  onClose,
  onToggleReserve,
  onToggleBought,
}: {
  item: Item | null;
  reservedByName?: string | null;
  currentUserId?: string | null;
  reservePending?: boolean;
  boughtPending?: boolean;
  onClose: () => void;
  onToggleReserve: (itemId: string) => void;
  onToggleBought: (itemId: string) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);

  if (!item) return null;
  const selectedItem = item;

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
  const itemUrl = getValidHttpUrl(item.url) ?? "";
  const additionalLinks = (item.additional_links ?? [])
    .map((link) => ({ ...link, url: getValidHttpUrl(link.url) }))
    .filter((link): link is typeof link & { url: string } => link.url !== null);
  const hasLinks = itemUrl.length > 0 || additionalLinks.length > 0;
  const salePercentOff = getSalePercentOff(item.price, item.discount_price, item.has_discount);

  function openLink(url: string | null) {
    if (!url) return;
    void Linking.openURL(url);
  }

  async function copyLink(url: string | null) {
    const link = url?.trim();
    if (!link) return;
    await Clipboard.setStringAsync(link);
  }

  function confirmReservation() {
    if (!reservation.canToggleReservation) return;

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
    if (!reservation.canToggleBought) return;

    setConfirmation({
      title: reservation.isPurchased ? t("Mark as not purchased?") : t("Mark as purchased?"),
      message: selectedItem.name,
      confirmLabel: reservation.isPurchased ? t("Undo") : t("Buy"),
      isPending: boughtPending,
      tone: reservation.isPurchased ? "destructive" : "success",
      onConfirm: () => {
        setConfirmation(null);
        onToggleBought(selectedItem.id);
      },
    });
  }

  return (
    <>
      <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={onClose}>
        <View className="gap-5 px-5 pt-5">
          <ItemImage
            item={item}
            reservationLabel={reservationLabel}
            purchased={reservation.isPurchased}
            reserved={reservation.isReserved}
            priority={priority}
            priorityLabel={priorityLabel}
            salePercentOff={salePercentOff}
            showDiscountPrice={Boolean(item.has_discount)}
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
                    variant="outline"
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
                <Button
                  key={`${link.url}-${index}`}
                  variant="outline"
                  className="justify-start"
                  onPress={() => openLink(link.url)}
                >
                  <Icon as={ExternalLink} className="size-4 text-text" />
                  <Text numberOfLines={1}>
                    {link.title || getItemStoreFromUrl(link.url) || t("Link")}
                  </Text>
                </Button>
              ))}
            </View>
          ) : null}

          <View className="gap-2">
            <Button
              variant="ghost"
              size="lg"
              disabled={!reservation.canToggleReservation || reservePending}
              onPress={confirmReservation}
              className={
                reservation.isReserved
                  ? "w-full rounded-lg border border-brand bg-brand"
                  : "w-full rounded-lg border border-brand/25 bg-brand-lighter"
              }
            >
              {reservePending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Icon
                as={LockKeyhole}
                className={
                  reservation.isReserved ? "size-4 text-primary-foreground" : "size-4 text-brand"
                }
              />
              <Text className={reservation.isReserved ? "text-primary-foreground" : "text-brand"}>
                {!reservation.isReserved
                  ? t("Reserve this gift")
                  : reservation.reservedByMe
                    ? t("Release reservation")
                    : t("Reserved")}
              </Text>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              disabled={!reservation.canToggleBought || boughtPending}
              onPress={confirmBought}
              className={
                reservation.isPurchased
                  ? "w-full rounded-lg border border-destructive/35 bg-danger-bg"
                  : "w-full rounded-xl border border-success/70 bg-success-bg"
              }
            >
              {boughtPending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Icon
                as={ShoppingCart}
                className={
                  reservation.isPurchased ? "size-4 text-destructive" : "size-4 text-success"
                }
              />
              <Text className={reservation.isPurchased ? "text-destructive" : "text-success"}>
                {reservation.isPurchased ? t("Undo") : t("Buy")}
              </Text>
            </Button>
          </View>
        </View>
      </BottomSheet>
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
