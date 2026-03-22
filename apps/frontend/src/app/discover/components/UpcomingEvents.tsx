import { useMemo, useRef, useState } from "react";
import { useFriendsUpcomingWishlists } from "@/hooks/use-wishlists";
import styles from "./UpcomingEvents.module.scss";
import { getDaysUntil, formatShortDate, getDaysText } from "@/lib/discover-helper";
import { CalendarDays } from "lucide-react";
import { EventsCalendar } from "./EventsCalendar";

export function UpcomingEvents() {
  const { data: upcomingWishlists, isLoading } = useFriendsUpcomingWishlists();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const iconRef = useRef<HTMLButtonElement | null>(null);
  const sortedUpcomingWishlists = useMemo(
    () =>
      [...(upcomingWishlists ?? [])].sort(
        (left, right) =>
          new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
      ),
    [upcomingWishlists],
  );
  const firstEvent = sortedUpcomingWishlists[0];
  const visibleUpcomingWishlists = sortedUpcomingWishlists.slice(0, 4);

  if (isLoading) return <div>Loading...</div>;
  if (!firstEvent) return null;

  const daysUntil = getDaysUntil(firstEvent.event_date);
  const title = `${firstEvent.friend_name}'s ${firstEvent.wishlist_title} is ${getDaysText(daysUntil)}`;

  return (
    <div className={`${styles.card} ${calendarOpen ? styles.cardOpen : ""}`}>
      <div className={styles.titleRow}>
        <div className={styles.calendarAnchor}>
          <button
            ref={iconRef}
            className={`${styles.iconCircle} ${calendarOpen ? styles.iconCircleActive : ""}`}
            onClick={() => setCalendarOpen((v) => !v)}
            aria-label="Open events calendar"
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
          <strong>Upcoming Events</strong>
          <p>{title}</p>
        </div>
      </div>

      <div className={styles.dates}>
        {visibleUpcomingWishlists.map((event) => (
          <span key={event.wishlist_id}>
            {event.friend_name} · {formatShortDate(event.event_date)}
          </span>
        ))}
      </div>
    </div>
  );
}
