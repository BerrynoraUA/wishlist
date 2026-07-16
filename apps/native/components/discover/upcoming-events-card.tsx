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
  const nextEvent = sortedEvents[0];

  if (isLoading || isError || !nextEvent) return null;

  const daysUntil = getDaysUntil(nextEvent.event_date);
  return (
    <>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Open upcoming events calendar")}
        className="h-auto items-stretch justify-start rounded-2xl border-border-subtle bg-card-bg p-4 shadow-sm"
        onPress={() => setOpen(true)}
        pressedScale={0.99}
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={CalendarDays} className="size-5 text-brand" />
          </View>
          <View className="min-w-0 flex-1 items-start gap-0.5">
            <Text className="text-base font-extrabold text-text">{t("Upcoming events")}</Text>
            <Text className="text-sm text-text-muted" numberOfLines={1}>
              {daysUntil === 0
                ? t("{name}'s {wishlist} is today", {
                    name: nextEvent.friend_name,
                    wishlist: nextEvent.wishlist_title,
                  })
                : daysUntil === 1
                  ? t("{name}'s {wishlist} is tomorrow", {
                      name: nextEvent.friend_name,
                      wishlist: nextEvent.wishlist_title,
                    })
                  : t("{name}'s {wishlist} in {count} days", {
                      name: nextEvent.friend_name,
                      wishlist: nextEvent.wishlist_title,
                      count: Math.max(daysUntil ?? 0, 0),
                    })}
            </Text>
            <Text className="text-xs font-bold text-brand">
              {formatDiscoverDate(nextEvent.event_date)}
            </Text>
          </View>
          <Icon as={ChevronRight} className="size-5 text-text-muted" />
        </View>
      </AnimatedPressable>

      {open ? <EventsCalendarSheet events={sortedEvents} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
