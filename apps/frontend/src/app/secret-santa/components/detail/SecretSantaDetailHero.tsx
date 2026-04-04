"use client";

import { useEffect, useRef, useState } from "react";
import type { SecretSantaDetails } from "@/api/types/secret-santa";
import {
  CalendarDays,
  Check,
  Copy,
  Crown,
  DollarSign,
  MoreHorizontal,
  TreePine,
  Users,
} from "lucide-react";
import styles from "./SecretSantaDetailHero.module.scss";
import {
  formatEventDate,
  type SecretSantaAccent,
} from "./secretSantaDetail.utils";

type Props = {
  event: SecretSantaDetails;
  accent: SecretSantaAccent;
  isOwner: boolean;
  totalPeople: number;
  copied: boolean;
  onCopyLink: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function SecretSantaDetailHero({
  event,
  accent,
  isOwner,
  totalPeople,
  copied,
  onCopyLink,
  onEdit,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showMenu = Boolean(onEdit || onDelete);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <section className={styles.hero}>
      {isOwner && (
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={onCopyLink}
            aria-label={copied ? "Invite link copied" : "Copy invite link"}
            title={copied ? "Copied" : "Copy invite link"}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>

          {showMenu && (
            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Event actions"
                title="More options"
              >
                <MoreHorizontal size={15} />
              </button>

              {menuOpen && (
                <div className={styles.menuDropdown}>
                  {onEdit && (
                    <button
                      type="button"
                      className={`${styles.menuItem} ${styles.editItem}`}
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit();
                      }}
                    >
                      <span>Edit</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className={`${styles.menuItem} ${styles.dangerItem}`}
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                    >
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${styles.heroVisual} ${styles[accent]}`}>
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.name}
            className={styles.heroImage}
          />
        ) : (
          <TreePine size={52} className={styles.heroIcon} />
        )}
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.badges}>
          <span className={styles.badge}>
            <CalendarDays size={14} />
            {formatEventDate(event.event_date)}
          </span>
          <span className={styles.badge}>
            <DollarSign size={14} />
            Budget {event.budget}
          </span>
          <span className={styles.badge}>
            <Users size={14} />
            {totalPeople} people
          </span>
        </div>

        <div className={styles.heroCopy}>
          <div className={styles.titleRow}>
            <h1>{event.name}</h1>
            {isOwner && (
              <span className={styles.ownerPill}>
                <Crown size={14} />
                You are the owner
              </span>
            )}
          </div>
          <p>
            {isOwner
              ? "Track accepted participants, monitor pending invites, and get this exchange ready to launch."
              : "See who joined the event, check the budget and date, and watch for your assigned receiver."}
          </p>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span>Accepted participants</span>
            <strong>{event.participants.length}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>Pending invites</span>
            <strong>{event.pending_invites.length}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>Budget per person</span>
            <strong>{event.budget}</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
