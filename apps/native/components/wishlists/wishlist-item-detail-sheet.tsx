import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemPriorityLabel,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
} from "@/lib/items";
import type { Item } from "@wishlist/backend/types/item";
import * as Clipboard from "expo-clipboard";
import { Copy, ExternalLink, Gift, Pencil, ShoppingCart, Trash2 } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Alert, Linking, View } from "react-native";

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
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!item) return null;
  const selectedItem = item;

  const reservation = getItemReservationState({
    status: selectedItem.status,
    reservedBy: selectedItem.reserved_by,
    currentUserId,
    isOwner,
  });
  const reservationLabel = buildReservationLabel({
    ...reservation,
    reservedByName,
  });
  const priorityLabel = getItemPriorityLabel(selectedItem.priority);
  const store = getItemStoreFromUrl(selectedItem.url);
  const salePercentOff = getSalePercentOff(
    selectedItem.price,
    selectedItem.discount_price,
    selectedItem.has_discount,
  );

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function confirmReservation() {
    if (!reservation.canToggleReservation || !onToggleReserve) return;

    Alert.alert(
      reservation.isReserved ? "Release reservation?" : "Reserve this gift?",
      selectedItem.name,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: reservation.isReserved ? "Release" : "Reserve",
          onPress: () => onToggleReserve(selectedItem.id),
        },
      ],
    );
  }

  function confirmBought() {
    if (!reservation.canToggleBought || !onToggleBought) return;

    Alert.alert(
      reservation.isPurchased ? "Mark as not purchased?" : "Mark as purchased?",
      selectedItem.name,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: reservation.isPurchased ? "Undo" : "Bought",
          onPress: () => onToggleBought(selectedItem.id),
        },
      ],
    );
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
    <BottomSheet
      ref={sheetRef}
      detents={[0.72, 1]}
      scrollable
      dismissOnBack={false}
      onDidDismiss={onClose}
      header={
        <Text className="mx-5 mt-5 text-2xl font-extrabold leading-7 text-text">{item.name}</Text>
      }
    >
      <View className="gap-5 px-5 pb-6 pt-5">
        <View className="h-56 overflow-hidden rounded-2xl border border-border-subtle bg-bg-muted">
          {item.image_url ? (
            <StyledImage source={{ uri: item.image_url }} contentFit="cover" className="size-full" />
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
                Sale -{salePercentOff}%
              </Text>
            ) : null}
            {priorityLabel ? (
              <Text className="rounded-full bg-bg-subtle px-3 py-1.5 text-sm font-bold text-text-muted">
                {priorityLabel}
              </Text>
            ) : null}
            {reservationLabel ? (
              <Text className="rounded-full bg-bg-subtle px-3 py-1.5 text-sm font-bold text-text-muted">
                {reservationLabel}
              </Text>
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
                  <Text numberOfLines={1}>{store || "Visit website"}</Text>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  accessibilityLabel="Copy link"
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
                    {link.title || getItemStoreFromUrl(link.url) || "Link"}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  accessibilityLabel="Copy link"
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
                  <Text>Edit</Text>
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
                  <Text>Delete</Text>
                </Button>
              ) : null}
            </View>
          ) : (
            <View className="gap-2">
              {onToggleReserve ? (
                <Button
                  variant={reservation.isReserved ? "secondary" : "default"}
                  disabled={!reservation.canToggleReservation || reservePending}
                  onPress={confirmReservation}
                >
                  {reservePending ? (
                    <ActivityIndicator colorClassName="accent-primary-foreground" />
                  ) : null}
                  <Text>
                    {!reservation.isReserved
                      ? "Reserve this gift"
                      : reservation.reservedByMe
                        ? "Release reservation"
                        : "Reserved"}
                  </Text>
                </Button>
              ) : null}
              {onToggleBought ? (
                <Button
                  variant={reservation.isPurchased ? "secondary" : "default"}
                  disabled={!reservation.canToggleBought || boughtPending}
                  onPress={confirmBought}
                >
                  {boughtPending ? (
                    <ActivityIndicator colorClassName="accent-primary-foreground" />
                  ) : null}
                  <Icon as={ShoppingCart} className="size-4 text-primary-foreground" />
                  <Text>{reservation.isPurchased ? "Purchased" : "Bought"}</Text>
                </Button>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}
