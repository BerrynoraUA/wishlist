import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatDiscoverDate, getDaysUntil } from "@/lib/discover";
import type { FriendUpcomingWishlist } from "@wishlist/backend/types/discover";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function UpcomingEventsCard({
  events,
  isLoading,
  isError,
}: {
  events: FriendUpcomingWishlist[];
  isLoading: boolean;
  isError: boolean;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [open, setOpen] = React.useState(false);
  const sortedEvents = React.useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      ),
    [events],
  );
  const nextEvent = sortedEvents[0];

  if (isLoading || isError || !nextEvent) return null;

  const daysUntil = getDaysUntil(nextEvent.event_date);
  const visibleEvents = sortedEvents.slice(0, 4);

  return (
    <>
      <Button
        variant="outline"
        className="h-auto items-stretch justify-start rounded-xl border-border-subtle bg-card-bg p-4 shadow-sm"
        onPress={() => setOpen(true)}
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={CalendarDays} className="size-5 text-brand" />
          </View>
          <View className="min-w-0 flex-1 items-start gap-1">
            <Text className="text-sm font-extrabold text-text">{t("Upcoming events")}</Text>
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              {daysUntil === 0
                ? t("{name}'s wishlist is today", { name: nextEvent.friend_name })
                : daysUntil === 1
                  ? t("{name}'s wishlist is tomorrow", { name: nextEvent.friend_name })
                  : t("{name}'s wishlist in {count} days", {
                      name: nextEvent.friend_name,
                      count: Math.max(daysUntil ?? 0, 0),
                    })}
            </Text>
          </View>
          <Icon as={ChevronRight} className="size-4 text-text-muted" />
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          {visibleEvents.map((event) => (
            <View
              key={`${event.wishlist_id}-${event.event_date}`}
              className="rounded-full bg-bg-subtle px-3 py-1.5"
            >
              <Text className="text-xs font-bold text-text-muted">
                {formatDiscoverDate(event.event_date)} / {event.friend_name}
              </Text>
            </View>
          ))}
        </View>
      </Button>

      {open ? (
        <BottomSheet
          ref={sheetRef}
          onDidDismiss={() => setOpen(false)}
          header={
            <Text className="mx-5 mt-5 text-2xl font-extrabold text-text">
              {t("Upcoming events")}
            </Text>
          }
        >
          <View className="gap-3 px-5 pb-6 pt-4">
            {sortedEvents.map((event) => (
              <View
                key={`${event.wishlist_id}-${event.event_date}`}
                className="gap-1 rounded-xl border border-border-subtle bg-card-bg p-4"
              >
                <Text className="text-base font-extrabold text-text">{event.friend_name}</Text>
                <Text className="text-sm font-semibold text-text-muted">
                  {event.wishlist_title}
                </Text>
                <Text className="text-sm font-bold text-brand">
                  {formatDiscoverDate(event.event_date)}
                </Text>
              </View>
            ))}
          </View>
        </BottomSheet>
      ) : null}
    </>
  );
}
