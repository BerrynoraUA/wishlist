"use client";

import { useGT, useLocale } from "gt-next";
import { useRouter } from "next/navigation";
import styles from "./SecretSantaEventCard.module.scss";
import { TreePine, CalendarDays, Users } from "lucide-react";
import type { SecretSantaListItem } from "@/api/types/secret-santa";
import { useCurrencyFormatter } from "@/hooks/use-currency";

type Props = {
  event: SecretSantaListItem;
};

const accents = ["pink", "blue", "mint", "peach", "lavender"] as const;

function getAccentFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return accents[Math.abs(hash) % accents.length];
}

function formatEventDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function SecretSantaEventCard({ event }: Props) {
  const t = useGT();
  const locale = useLocale();
  const router = useRouter();
  const { formatPrice } = useCurrencyFormatter();
  const accent = getAccentFromId(event.id);
  const hasImage = Boolean(event.image_url);

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/secret-santa/${event.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className={`${styles.top} ${styles[accent]}`}>
        {hasImage && (
          <img
            src={event.image_url as string}
            alt={event.name}
            className={styles.coverImage}
          />
        )}
        {event.is_owner && (
          <div className={styles.ownerBadge}>
            <TreePine size={12} />
            <span>
              {t("Organizer", { $id: "secretSanta.card.organizer" })}
            </span>
          </div>
        )}
        {!hasImage && <TreePine size={40} className={styles.icon} />}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{event.name}</h3>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Users size={14} />
            {t("{count} participants", {
              count: event.participants_count,
              $id: "secretSanta.card.participantsCount",
            })}
          </span>

          <span className={styles.metaItem}>
            {formatPrice(event.budget, event.currency)}
          </span>
        </div>

        <div className={styles.date}>
          <CalendarDays size={14} />
          <span>
            {formatEventDate(event.event_date, locale ?? "en")}
          </span>
        </div>
      </div>
    </div>
  );
}
