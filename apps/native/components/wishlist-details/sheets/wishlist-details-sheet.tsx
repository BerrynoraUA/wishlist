import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistVisibilityLabels,
} from "@/lib/wishlists";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { CalendarDays, FileText, ListChecks } from "lucide-react-native";
import { useGT, useLocale } from "gt-react-native";
import * as React from "react";
import { ScrollView, View } from "react-native";

export function WishlistDetailsSheet({
  wishlist,
  onClose,
}: {
  wishlist: Wishlist;
  onClose: () => void;
}) {
  const t = useGT();
  const locale = useLocale();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const visibilityLabels = React.useMemo(() => getWishlistVisibilityLabels(t), [t]);
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[wishlist.visibility_type];
  const eventDate = React.useMemo(
    () => formatEventDate(wishlist.event_date, locale ?? "en"),
    [locale, wishlist.event_date],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto", 0.9]}
      initialDetentIndex={0}
      initialDetentAnimated
      onDidDismiss={onClose}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
      >
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View className="size-9 items-center justify-center rounded-full bg-brand-lighter">
              <Icon as={ListChecks} className="size-4 text-brand" />
            </View>
            <Text className="text-sm font-bold text-text-muted">{t("Wishlist details")}</Text>
          </View>
          <Text selectable className="text-2xl font-extrabold leading-8 text-text">
            {wishlist.title}
          </Text>
        </View>

        {wishlist.image_url ? (
          <View className="aspect-video w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-muted">
            <StyledImage
              source={{ uri: wishlist.image_url }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`wishlist-details-${wishlist.id}`}
              className="size-full"
            />
          </View>
        ) : null}

        <View className="gap-2 rounded-2xl border border-border-subtle bg-card-bg p-4">
          <View className="flex-row items-center gap-2">
            <Icon as={FileText} className="size-4 text-brand" />
            <Text className="text-sm font-bold text-text">{t("Description")}</Text>
          </View>
          <Text selectable className="text-sm leading-6 text-text-muted">
            {wishlist.description || t("No description")}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border border-border-subtle bg-card-bg p-3">
            <View className="size-9 items-center justify-center rounded-full bg-brand-lighter">
              <Icon as={VisibilityIcon} className="size-4 text-brand" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold text-text-muted">{t("Visibility")}</Text>
              <Text numberOfLines={1} className="text-sm font-bold text-text">
                {visibilityLabels[wishlist.visibility_type]}
              </Text>
            </View>
          </View>

          {eventDate ? (
            <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border border-border-subtle bg-card-bg p-3">
              <View className="size-9 items-center justify-center rounded-full bg-brand-lighter">
                <Icon as={CalendarDays} className="size-4 text-brand" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold text-text-muted">{t("Event date")}</Text>
                <Text numberOfLines={1} className="text-sm font-bold text-text">
                  {eventDate}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function formatEventDate(value: string | null, locale: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)));
}
