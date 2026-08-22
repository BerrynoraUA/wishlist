import { EventsCalendarSheet } from "@/components/discover/events-calendar-sheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
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
  const [open, setOpen] = React.useState(false);
  const sortedEvents = React.useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      ),
    [events],
  );
  const previewEvents = sortedEvents.slice(0, 2);

  if (isLoading || isError || previewEvents.length === 0) return null;

  return (
    <>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Open upcoming events calendar")}
        className="h-auto items-stretch justify-start rounded-2xl border-border-subtle bg-card-bg p-4 shadow-sm"
        onPress={() => setOpen(true)}
        pressedScale={0.99}
      >
        <View className="flex-row items-start gap-3">
          <View className="size-11 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={CalendarDays} className="size-5 text-brand" />
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-base font-extrabold text-text">{t("Upcoming events")}</Text>
              <Icon as={ChevronRight} className="size-5 shrink-0 text-text-muted" />
            </View>
            <View className="gap-1.5 pe-3">
              {previewEvents.map((event) => {
                const daysUntil = getDaysUntil(event.event_date);
                const eventSummary =
                  daysUntil === 0
                    ? t("{name}'s {wishlist} is today", {
                        name: event.friend_name,
                        wishlist: event.wishlist_title,
                      })
                    : daysUntil === 1
                      ? t("{name}'s {wishlist} is tomorrow", {
                          name: event.friend_name,
                          wishlist: event.wishlist_title,
                        })
                      : t("{name}'s {wishlist} in {count} days", {
                          name: event.friend_name,
                          wishlist: event.wishlist_title,
                          count: Math.max(daysUntil ?? 0, 0),
                        });

                return (
                  <View
                    key={`${event.wishlist_id}-${event.event_date}`}
                    className="flex-row items-center gap-2"
                  >
                    <Text className="min-w-0 flex-1 text-sm text-text-muted" numberOfLines={1}>
                      {eventSummary}
                    </Text>
                    <Text className="shrink-0 text-xs font-bold text-brand">
                      {formatDiscoverDate(event.event_date)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </AnimatedPressable>

      {open ? <EventsCalendarSheet events={sortedEvents} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
