import { useFriendsUpcomingWishlists } from "@/hooks/use-wishlists";
import styles from "./UpcomingEvents.module.scss";
import { getDaysUntil, formatShortDate, getDaysText } from "@/lib/discover-helper";
import { CalendarDays } from "lucide-react";

export function UpcomingEvents() {
  const { data: upcomingWishlists, isLoading } = useFriendsUpcomingWishlists();
  const firstEvent = upcomingWishlists?.[0];

  if (isLoading) return <div>Loading...</div>;
  if (!firstEvent) return null;

  const daysUntil = getDaysUntil(firstEvent.event_date);
  const title = `${firstEvent.friend_name}'s ${firstEvent.wishlist_title} is ${getDaysText(daysUntil)}`;

  return (
    <div className={styles.card}>
      <div className={styles.titleRow}>
        <span className={styles.iconCircle} aria-hidden="true">
          <CalendarDays size={18} />
        </span>
        <div>
          <strong>Upcoming Events</strong>
          <p>{title}</p>
        </div>
      </div>

      <div className={styles.dates}>
        {upcomingWishlists?.map((event) => (
          <span key={event.wishlist_id}>
            {event.friend_name} · {formatShortDate(event.event_date)}
          </span>
        ))}
      </div>
    </div>
  );
}
