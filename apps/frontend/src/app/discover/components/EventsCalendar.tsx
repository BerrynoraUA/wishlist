"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FriendUpcomingWishlist } from "@/api/types/wishilst";
import { Calendar, type CalendarCell } from "@/components/ui/Calendar/Calendar";
import styles from "./EventsCalendar.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  events: FriendUpcomingWishlist[];
  anchorRef: React.RefObject<HTMLElement | null>;
};

const ACCENT_COLORS = ["#f472b6", "#60a5fa", "#fdba74", "#6ee7b7", "#c4b5fd"];

function getColor(index: number) {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

export function EventsCalendar({ open, onClose, events, anchorRef }: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    dateLabel: string;
    items: FriendUpcomingWishlist[];
  } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateToWishlist = useCallback(
    (wishlistId: string) => {
      onClose();
      router.push(`/wishlist/${wishlistId}`);
    },
    [onClose, router],
  );

  // Index events by "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FriendUpcomingWishlist[]>();
    for (const e of events) {
      const d = new Date(e.event_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  // Assign stable color per friend
  const friendColorMap = useMemo(() => {
    const ids = Array.from(new Set(events.map((e) => e.friend_id)));
    const map = new Map<string, string>();
    ids.forEach((id, i) => map.set(id, getColor(i)));
    return map;
  }, [events]);

  const legendEntries = useMemo(() => {
    const uniqueFriends = new Map<string, { friendId: string; friendName: string; color: string }>();

    for (const event of events) {
      if (uniqueFriends.has(event.friend_id)) continue;
      uniqueFriends.set(event.friend_id, {
        friendId: event.friend_id,
        friendName: event.friend_name,
        color: friendColorMap.get(event.friend_id) ?? ACCENT_COLORS[0],
      });
    }

    return Array.from(uniqueFriends.values()).slice(0, 4);
  }, [events, friendColorMap]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleCellClick = useCallback(
    (dateKey: string) => {
      const dayEvents = eventsByDate.get(dateKey) ?? [];
      if (dayEvents.length === 1) {
        navigateToWishlist(dayEvents[0].wishlist_id);
      }
    },
    [eventsByDate, navigateToWishlist],
  );

  const handleCellMouseEnter = useCallback(
    (dateKey: string, e: React.MouseEvent) => {
      const dayEvents = eventsByDate.get(dateKey) ?? [];
      if (dayEvents.length === 0) return;
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const popupRect = popupRef.current?.getBoundingClientRect();
      const [year, month, day] = dateKey.split("-").map(Number);
      const dateLabel = new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      setTooltip({
        x: rect.left - (popupRect?.left ?? 0) + rect.width / 2,
        y: rect.top - (popupRect?.top ?? 0) - 4,
        dateLabel,
        items: dayEvents,
      });
    },
    [eventsByDate],
  );

  const handleCellMouseLeave = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 200);
  }, []);

  const getCellClassName = useCallback(
    (cell: CalendarCell) => {
      if (!cell.dateKey) return "";
      const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
      const classes: string[] = [];
      if (dayEvents.length > 0) classes.push(styles.hasEvent);
      if (dayEvents.length > 1) classes.push(styles.multiEvent);
      return classes.join(" ");
    },
    [eventsByDate],
  );

  const getCellStyle = useCallback(
    (cell: CalendarCell): React.CSSProperties | undefined => {
      if (!cell.dateKey) return undefined;
      const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
      if (dayEvents.length === 0) return undefined;
      const primaryColor = friendColorMap.get(dayEvents[0].friend_id) ?? ACCENT_COLORS[0];
      return {
        background:
          dayEvents.length > 1
            ? `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 72%, white))`
            : primaryColor,
        borderColor: "rgba(255, 255, 255, 0.3)",
      };
    },
    [eventsByDate, friendColorMap],
  );

  const renderCellContent = useCallback(
    (cell: CalendarCell) => {
      const dayEvents = cell.dateKey ? (eventsByDate.get(cell.dateKey) ?? []) : [];
      const hasEvents = dayEvents.length > 0;

      let dayClass: string | undefined;
      if (hasEvents) {
        dayClass = styles.dayNumberEvent;
      } else if (cell.isToday) {
        dayClass = styles.dayNumberToday;
      } else {
        dayClass = styles.dayNumber;
      }

      return (
        <>
          <span className={dayClass}>{cell.day}</span>
          {dayEvents.length > 1 && (
            <span className={styles.eventCountBadge}>{dayEvents.length}</span>
          )}
        </>
      );
    },
    [eventsByDate],
  );

  const legendFooter = legendEntries.length > 0 ? (
    <div className={styles.legend}>
      {legendEntries.map((entry) => (
        <div key={entry.friendId} className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: entry.color }} />
          <span className={styles.legendLabel}>{entry.friendName}</span>
        </div>
      ))}
    </div>
  ) : undefined;

  if (!open) return null;

  return (
    <div className={styles.popup} ref={popupRef} role="dialog" aria-label="Events calendar">
      <div className={styles.inner}>
        <Calendar
          onCellClick={handleCellClick}
          onCellMouseEnter={handleCellMouseEnter}
          onCellMouseLeave={handleCellMouseLeave}
          onMonthChange={() => setTooltip(null)}
          cellClassName={getCellClassName}
          cellStyle={getCellStyle}
          renderCellContent={renderCellContent}
          footer={legendFooter}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          onMouseEnter={() => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
          }}
          onMouseLeave={handleCellMouseLeave}
        >
          <div className={styles.tooltipHeader}>
            <span>{tooltip.dateLabel}</span>
            <span>{tooltip.items.length} event{tooltip.items.length > 1 ? "s" : ""}</span>
          </div>
          {tooltip.items.map((ev) => (
            <div
              key={ev.wishlist_id}
              className={styles.tooltipRow}
              onClick={() => navigateToWishlist(ev.wishlist_id)}
            >
              <span
                className={styles.tooltipDot}
                style={{ background: friendColorMap.get(ev.friend_id) }}
              />
              <div className={styles.tooltipText}>
                <strong>{ev.wishlist_title}</strong>
                <span>{ev.friend_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
