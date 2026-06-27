import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import {
  buildReservationLabel,
  getItemReservationState,
  getItemStoreFromUrl,
  getSalePercentOff,
  getTranslatedItemPriorityLabel,
} from "@/lib/items";
import type { Item } from "@wishlist/backend/types/item";
import { Copy, ExternalLink, Gift, ShoppingCart } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Linking, Platform, View } from "react-native";

export function DiscoverItemDetailSheet({
  item,
  currentUserId,
  reservePending,
  boughtPending,
  onClose,
  onToggleReserve,
  onToggleBought,
}: {
  item: Item | null;
  currentUserId?: string | null;
  reservePending?: boolean;
  boughtPending?: boolean;
  onClose: () => void;
  onToggleReserve: (itemId: string) => void;
  onToggleBought: (itemId: string) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!item) return null;

  const reservation = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
    isOwner: false,
  });
  const reservationLabel = buildReservationLabel({ ...reservation }, t);
  const priorityLabel = getTranslatedItemPriorityLabel(t, item.priority_id) ?? item.priority_name;
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

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      dismissOnBack={false}
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
            variant={reservation.isReserved ? "secondary" : "default"}
            disabled={!reservation.canToggleReservation || reservePending}
            onPress={() => onToggleReserve(item.id)}
          >
            {reservePending ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : null}
            <Text>
              {!reservation.isReserved
                ? t("Reserve this gift")
                : reservation.reservedByMe
                  ? t("Release reservation")
                  : t("Reserved")}
            </Text>
          </Button>
          <Button
            variant={reservation.isPurchased ? "secondary" : "default"}
            disabled={!reservation.canToggleBought || boughtPending}
            onPress={() => onToggleBought(item.id)}
          >
            {boughtPending ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : null}
            <Icon as={ShoppingCart} className="size-4 text-primary-foreground" />
            <Text>{reservation.isPurchased ? t("Purchased") : t("Bought")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
