import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  useSheetContentDetent,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { ItemImage } from "@/components/items/item-image";
import { ItemReportButton } from "@/components/items/item-report-button";
import {
  ActionBottomSheetConfirm,
  type ActionBottomSheetConfirmTone,
} from "@/components/ui/action-bottom-sheet";
import { Button } from "@/components/ui/button";
import { useReportItem } from "@/hooks/use-items";
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
import { getLinkUrl, getValidHttpUrl } from "@/lib/urls";
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
  const { detent, onContentSizeChange, onHeaderLayout } = useSheetContentDetent();
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const reportItem = useReportItem();

  if (!item) return null;
  const selectedItem = item;

  const reservation = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
  });
  const reservationLabel = buildReservationLabel({ ...reservation, reservedByName }, t);
  const priorityLabel = getTranslatedItemPriorityLabel(t, item.priority_id) ?? item.priority_name;
  const priority = getItemPriority(item.priority_id ?? item.priority_name);
  const itemUrl = getValidHttpUrl(item.url) ?? "";
  const additionalLinks = (item.additional_links ?? [])
    .map((link) => ({ ...link, url: getLinkUrl(link.url) }))
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
      tone: reservation.isPurchased ? "destructive" : "buy",
      onConfirm: () => {
        setConfirmation(null);
        onToggleBought(selectedItem.id);
      },
    });
  }

  // Actions stay visible but are locked when the viewer can't perform them. "Undo" only
  // appears for a purchase this viewer made — someone else's purchase shows a locked "Buy".
  const canReserve = reservation.canToggleReservation;
  const canBuy = reservation.canToggleBought;
  const canUndoPurchase = reservation.isPurchased && canBuy;
  const reservedByMe = reservation.isReserved && reservation.reservedByMe;
  // A purchased gift is reserved too, so both buttons report the state they are locked in.
  const showAsReserved = reservation.isReserved || reservation.isPurchased;

  const actions = (
    <View className="w-full gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
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
        {reservePending ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
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
        {boughtPending ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
        <Icon
          as={ShoppingCart}
          className={canUndoPurchase ? "size-4 text-destructive" : "size-4 text-buy"}
        />
        <Text className={canUndoPurchase ? "text-destructive" : "text-buy"}>
          {canUndoPurchase ? t("Undo") : reservation.isPurchased ? t("Purchased") : t("Buy")}
        </Text>
      </Button>
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
        footer={actions}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-5"
          onContentSizeChange={onContentSizeChange}
        >
          <ItemImage
            item={item}
            reservationLabel={reservationLabel}
            purchased={reservation.isPurchased}
            priority={priority}
            priorityLabel={priorityLabel}
            salePercentOff={salePercentOff}
            showDiscountPrice={Boolean(item.has_discount)}
            endAction={<ItemReportButton onPress={() => setReportOpen(true)} />}
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
          reportItem.mutate(item.id, { onSettled: () => setReportOpen(false) });
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
