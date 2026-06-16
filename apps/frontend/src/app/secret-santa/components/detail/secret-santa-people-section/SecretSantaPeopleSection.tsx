"use client";

import { useGT } from "gt-next";
import type { SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import { X } from "lucide-react";
import { SecretSantaPersonAvatar } from "../secret-santa-person-avatar/SecretSantaPersonAvatar";
import styles from "./SecretSantaPeopleSection.module.scss";
import {
  MascotEmptyState,
  type MascotVariant,
} from "@/components/ui/MascotEmptyState/MascotEmptyState";

type PersonItem = SecretSantaPerson & {
  key: string;
  subtitle: string;
  badge?: string;
};

type Props = {
  title: string;
  description: string;
  emptyText: string;
  people: PersonItem[];
  onRemove?: (itemId: string) => void;
  removeLabel?: string;
  emptyMascot?: MascotVariant;
};

export function SecretSantaPeopleSection({
  title,
  description: _description,
  emptyText,
  people,
  onRemove,
  removeLabel,
  emptyMascot,
}: Props) {
  const t = useGT();
  const userFallback = t("User", { $id: "secretSanta.peopleSection.userFallback" });

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
        </div>
      </div>

      {people.length === 0 ? (
        emptyMascot ? (
          <MascotEmptyState compact variant={emptyMascot} message={emptyText} />
        ) : (
          <p className={styles.empty}>{emptyText}</p>
        )
      ) : (
        <div className={styles.peopleGrid}>
          {people.map((person) => (
            <article
              key={person.key}
              className={person.badge ? styles.personCardMuted : styles.personCard}
            >
              <SecretSantaPersonAvatar person={person} />
              <div className={styles.personMeta}>
                <strong>{person.display_name ?? person.nickname ?? userFallback}</strong>
                <span>{person.subtitle}</span>
              </div>
              {person.badge && <span className={styles.pendingBadge}>{person.badge}</span>}
              {onRemove && removeLabel && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemove(person.key)}
                  aria-label={removeLabel}
                >
                  <X size={14} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
