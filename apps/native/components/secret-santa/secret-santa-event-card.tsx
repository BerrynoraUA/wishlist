import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { formatSecretSantaBudget, formatSecretSantaDate } from "@/lib/secret-santa";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import type { SecretSantaListItem } from "@wishlist/backend/types/secret-santa";
import { CalendarDays, Gift, Users } from "lucide-react-native";
import { useGT, useLocale } from "gt-react-native";
import { Pressable, View } from "react-native";

export function SecretSantaEventCard({
  event,
  width,
  onPress,
}: {
  event: SecretSantaListItem;
  width: number;
  onPress: () => void;
}) {
  const t = useGT();
  const locale = useLocale();

  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Open "{name}"', { name: event.name })}
        onPress={onPress}
        className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm active:scale-[0.99]"
      >
        <View
          className={cn(
            "relative h-32 items-center justify-center overflow-hidden",
            getWishlistAccentClass(null),
          )}
        >
          {event.image_url ? (
            <StyledImage
              source={{ uri: event.image_url }}
              contentFit="cover"
              className="absolute inset-0 size-full"
            />
          ) : (
            <Icon as={Gift} className="size-10 text-brand" />
          )}
          {event.is_owner ? (
            <View className="absolute right-3 top-3 rounded-full border border-white/35 bg-white/25 px-2 py-1">
              <Text className="text-[11px] font-extrabold text-white">{t("Owner")}</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-3 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-lg font-extrabold text-text" numberOfLines={2}>
                {event.name}
              </Text>
              <Text className="text-sm font-semibold text-brand" numberOfLines={1}>
                {formatSecretSantaBudget(event.budget, event.currency)}
              </Text>
            </View>
            <View className="max-w-[48%] shrink-0 items-end gap-1.5">
              <View className="flex-row items-center justify-end gap-1.5">
                <Icon as={CalendarDays} className="size-4 text-text-muted" />
                <Text className="text-right text-sm text-text-muted" numberOfLines={1}>
                  {formatSecretSantaDate(event.event_date, locale ?? "en")}
                </Text>
              </View>
              <View className="flex-row items-center justify-end gap-1.5">
                <Icon as={Users} className="size-4 text-text-muted" />
                <Text className="text-right text-sm text-text-muted" numberOfLines={1}>
                  {t("{count} participants", { count: event.participants_count })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
