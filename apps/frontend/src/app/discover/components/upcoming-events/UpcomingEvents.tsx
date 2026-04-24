"use client";

import { useMemo, useRef, useState } from "react";
import { useGT } from "gt-next";
import { useFriendsUpcomingWishlists } from "@/hooks/use-wishlists";
import styles from "./UpcomingEvents.module.scss";
import { getDaysUntil } from "../../helpers";
import { CalendarDays } from "lucide-react";
import { UpcomingEventsSkeleton } from "../discover-skeleton/DiscoverSkeleton";
import { EventsCalendar } from "../events-calendar/EventsCalendar";

export function UpcomingEvents() {
  const t = useGT();
  const { data: upcomingWishlists, isLoading } = useFriendsUpcomingWishlists();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const iconRef = useRef<HTMLButtonElement | null>(null);
  const sortedUpcomingWishlists = useMemo(
    () =>
      [...(upcomingWishlists ?? [])].sort(
        (left, right) => new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
      ),
    [upcomingWishlists],
  );
  const firstEvent = sortedUpcomingWishlists[0];
  const visibleUpcomingWishlists = sortedUpcomingWishlists.slice(0, 4);

  if (isLoading) {
    return <UpcomingEventsSkeleton />;
  }
  if (!firstEvent) return null;

  const daysUntil = getDaysUntil(firstEvent.event_date);
  const when =
    daysUntil === 0
      ? t("today", { $id: "discover.upcoming.today" })
      : daysUntil === 1
        ? t("tomorrow", { $id: "discover.upcoming.tomorrow" })
        : daysUntil < 0
          ? t("{days} days ago", {
              days: Math.abs(daysUntil),
              $id: "discover.upcoming.daysAgo",
            })
          : t("in {days} days", {
              days: daysUntil,
              $id: "discover.upcoming.inDays",
            });
  return (
    <div className={`${styles.card} ${calendarOpen ? styles.cardOpen : ""}`}>
      <div className={styles.titleRow}>
        <div className={styles.calendarAnchor}>
          <button
            ref={iconRef}
            className={`${styles.iconCircle} ${calendarOpen ? styles.iconCircleActive : ""} iconTooltipTrigger`}
            onClick={() => setCalendarOpen((v) => !v)}
            aria-label={t("Open events calendar", {
              $id: "discover.upcoming.calendarAria",
            })}
            data-tooltip={t("Open events calendar", {
              $id: "discover.upcoming.calendarTooltip",
            })}
          >
            <CalendarDays size={18} />
          </button>

          <EventsCalendar
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            events={upcomingWishlists ?? []}
            anchorRef={iconRef}
          />
        </div>
        <div>
          <strong>{t("Upcoming Events", { $id: "discover.upcoming.sectionTitle" })}</strong>
          <p>
            <span>
              {t("{friendName}'s", {
                friendName: firstEvent.friend_name,
                $id: "discover.upcoming.headlinePrefix",
              })}
            </span>{" "}
            <strong className={styles.wishlistName}>{firstEvent.wishlist_title}</strong>{" "}
            <span>
              {t("is {when}", {
                when,
                $id: "discover.upcoming.headlineSuffix",
              })}
            </span>
          </p>
        </div>
      </div>

      <div className={styles.dates}>
        {visibleUpcomingWishlists.map((event) => (
          <span key={event.wishlist_id}>
            {t("{friendName} · {date}", {
              friendName: event.friend_name,
              date: new Date(event.event_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
              $id: "discover.upcoming.dateRow",
            })}
          </span>
        ))}
      </div>
    </div>
  );
}
