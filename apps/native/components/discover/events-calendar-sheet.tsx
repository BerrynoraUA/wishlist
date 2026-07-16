import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatDiscoverDate } from "@/lib/discover";
import { shareCalendarEvents } from "@/lib/calendar-export";
import { cn } from "@/lib/utils";
import type { FriendUpcomingWishlist } from "@wishlist/backend/types/discover";
import { useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Gift } from "lucide-react-native";
import { useGT, useLocale } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type CalendarCell = {
  key: string;
  day: number | null;
  dateKey: string | null;
  isToday: boolean;
};

export function EventsCalendarSheet({
  events,
  onClose,
}: {
  events: FriendUpcomingWishlist[];
  onClose: () => void;
}) {
  const t = useGT();
  const locale = useLocale();
  const router = useRouter();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const sortedEvents = React.useMemo(
    () =>
      [...events].sort(
        (left, right) => new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
      ),
    [events],
  );
  const initialDate = React.useMemo(
    () => parseDateKey(toDateKey(sortedEvents[0]?.event_date)) ?? new Date(),
    [sortedEvents],
  );
  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(() =>
    sortedEvents[0] ? toDateKey(sortedEvents[0].event_date) : null,
  );
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const eventsByDate = React.useMemo(() => {
    const result = new Map<string, FriendUpcomingWishlist[]>();
    for (const event of sortedEvents) {
      const dateKey = toDateKey(event.event_date);
      if (!dateKey) continue;
      result.set(dateKey, [...(result.get(dateKey) ?? []), event]);
    }
    return result;
  }, [sortedEvents]);

  const cells = React.useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewMonth, viewYear]);
  const selectedEvents = selectedDateKey ? (eventsByDate.get(selectedDateKey) ?? []) : [];
  const selectedDateLabel = selectedDateKey
    ? formatLongDate(selectedDateKey, locale ?? "en")
    : t("No events selected");
  const monthLabel = new Intl.DateTimeFormat(locale ?? "en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewYear, viewMonth, 1, 12)));

  function changeMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth();
    setViewYear(nextYear);
    setViewMonth(nextMonth);

    const firstEventDate = sortedEvents
      .map((event) => toDateKey(event.event_date))
      .find((dateKey) => dateKey?.startsWith(`${nextYear}-${pad(nextMonth + 1)}-`));
    setSelectedDateKey(firstEventDate ?? null);
  }

  async function handleExport() {
    if (isExporting || sortedEvents.length === 0) return;

    setIsExporting(true);
    setExportError(null);
    try {
      const baseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(
        /\/$/,
        "",
      );
      await shareCalendarEvents(
        sortedEvents.map((event) => ({
          id: `${event.wishlist_id}-${event.event_date}`,
          title: `${event.friend_name}: ${event.wishlist_title}`,
          date: event.event_date,
          url: `${baseUrl}/wishlist/${event.wishlist_id}`,
        })),
        t("Export events"),
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t("Could not export events."));
    } finally {
      setIsExporting(false);
    }
  }

  function openWishlist(wishlistId: string) {
    void sheetRef.current?.dismiss();
    router.push(`/friends/wishlist/${wishlistId}` as never);
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      detents={[0.9, 1]}
      onDidDismiss={onClose}
      scrollableOptions={{ scrollingExpandsSheet: false }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={CalendarDays} className="size-5 text-brand" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-extrabold text-text">{t("Events calendar")}</Text>
            <Text className="text-sm text-text-muted">
              {t("{count} upcoming events", { count: sortedEvents.length })}
            </Text>
          </View>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            onPress={() => void handleExport()}
            className="rounded-full"
          >
            {isExporting ? (
              <ActivityIndicator colorClassName="accent-brand" size="small" />
            ) : (
              <Icon as={Download} className="size-4 text-brand" />
            )}
            <Text className="text-brand">{t("Export")}</Text>
          </Button>
        </View>

        <View className="rounded-2xl border border-border-subtle bg-card-bg p-3 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={t("Previous month")}
              onPress={() => changeMonth(-1)}
              className="rounded-full"
            >
              <Icon as={ChevronLeft} className="size-5 text-text" />
            </Button>
            <Text className="text-base font-extrabold capitalize text-text">{monthLabel}</Text>
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={t("Next month")}
              onPress={() => changeMonth(1)}
              className="rounded-full"
            >
              <Icon as={ChevronRight} className="size-5 text-text" />
            </Button>
          </View>

          <View className="mb-1 flex-row">
            {WEEKDAY_LABELS.map((weekday) => (
              <View key={weekday} className="flex-1 items-center py-1">
                <Text className="text-xs font-bold text-text-muted">{t(weekday)}</Text>
              </View>
            ))}
          </View>

          {chunkCalendarCells(cells).map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} className="flex-row">
              {week.map((cell) => {
                const dayEvents = cell.dateKey ? (eventsByDate.get(cell.dateKey) ?? []) : [];
                const hasEvents = dayEvents.length > 0;
                const isSelected = cell.dateKey === selectedDateKey;

                return (
                  <View key={cell.key} className="aspect-square flex-1 p-0.5">
                    {cell.day === null ? null : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          hasEvents
                            ? t("{date}, {count} events", {
                                date: cell.dateKey ?? "",
                                count: dayEvents.length,
                              })
                            : (cell.dateKey ?? "")
                        }
                        onPress={() => setSelectedDateKey(cell.dateKey)}
                        className={cn(
                          "flex-1 items-center justify-center rounded-xl border border-transparent active:opacity-75",
                          cell.isToday && "border-brand-alpha-20",
                          hasEvents && "bg-brand-lighter",
                          isSelected && "border-brand bg-brand",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-semibold text-text",
                            hasEvents && "font-extrabold text-brand",
                            isSelected && "text-primary-foreground",
                          )}
                        >
                          {cell.day}
                        </Text>
                        {hasEvents ? (
                          dayEvents.length === 1 ? (
                            <View
                              className={cn(
                                "mt-0.5 size-1.5 rounded-full bg-brand",
                                isSelected && "bg-primary-foreground",
                              )}
                            />
                          ) : (
                            <View
                              className={cn(
                                "mt-0.5 min-w-4 items-center rounded-full bg-brand px-1",
                                isSelected && "bg-primary-foreground",
                              )}
                            >
                              <Text
                                className={cn(
                                  "text-[9px] font-extrabold leading-4 text-primary-foreground",
                                  isSelected && "text-brand",
                                )}
                              >
                                {dayEvents.length}
                              </Text>
                            </View>
                          )
                        ) : null}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-base font-extrabold text-text">{selectedDateLabel}</Text>
            {selectedEvents.length > 0 ? (
              <Text className="text-xs font-bold text-brand">
                {t("{count} events", { count: selectedEvents.length })}
              </Text>
            ) : null}
          </View>

          {selectedEvents.length > 0 ? (
            selectedEvents.map((event) => (
              <Pressable
                key={`${event.wishlist_id}-${event.event_date}`}
                accessibilityRole="button"
                onPress={() => openWishlist(event.wishlist_id)}
                className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-3 active:bg-bg-subtle"
              >
                <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
                  <Icon as={Gift} className="size-4 text-brand" />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text numberOfLines={1} className="font-extrabold text-text">
                    {event.wishlist_title}
                  </Text>
                  <Text numberOfLines={1} className="text-sm text-text-muted">
                    {event.friend_name} · {formatDiscoverDate(event.event_date)}
                  </Text>
                </View>
                <Icon as={ChevronRight} className="size-4 text-text-muted" />
              </Pressable>
            ))
          ) : (
            <View className="items-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-muted px-4 py-6">
              <Icon as={CalendarDays} className="size-5 text-text-muted" />
              <Text className="text-center text-sm font-semibold text-text-muted">
                {t("No friends' events on this day.")}
              </Text>
            </View>
          )}
        </View>

        {exportError ? (
          <Text className="text-sm font-semibold text-destructive">{exportError}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const cells: CalendarCell[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({ key: `blank-start-${index}`, day: null, dateKey: null, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
    cells.push({ key: dateKey, day, dateKey, isToday: dateKey === todayKey });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({
      key: `blank-end-${cells.length}`,
      day: null,
      dateKey: null,
      isToday: false,
    });
  }

  return cells;
}

function chunkCalendarCells(cells: CalendarCell[]) {
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function toDateKey(value?: string | Date) {
  if (!value) return null;
  if (typeof value === "string") {
    const dateKey = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
    if (dateKey) return dateKey;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLongDate(dateKey: string, locale: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function parseDateKey(dateKey: string | null) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
