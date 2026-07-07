import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { ActionBottomSheetConfirm } from "@/components/ui/action-bottom-sheet";
import { Button } from "@/components/ui/button";
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
} from "@/lib/items";
import type { Item } from "@wishlist/backend/types/item";
import { Copy, ExternalLink, Gift, LockKeyhole, ShoppingCart } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
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
      confirmLabel: reservation.isPurchased ? t("Undo") : t("Bought"),
      isPending: boughtPending,
      onConfirm: () => {
        setConfirmation(null);
        onToggleBought(selectedItem.id);
      },
    });
  }

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        detents={["auto"]}
        onDidDismiss={onClose}
        header={<Text className="mx-5 mt-5 text-2xl font-extrabold text-text">{item.name}</Text>}
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
                item.has_discount && item.discount_price ? (
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
              {reservationLabel ? (
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
