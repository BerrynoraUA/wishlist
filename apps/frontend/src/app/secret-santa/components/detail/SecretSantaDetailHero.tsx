"use client";

import { useEffect, useRef, useState } from "react";
import { useGT, useLocale } from "gt-next";
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
  const t = useGT();
  const locale = useLocale();
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
            aria-label={
              copied
                ? t("Invite link copied", {
                    $id: "secretSanta.hero.aria.linkCopied",
                  })
                : t("Copy invite link", {
                    $id: "secretSanta.hero.aria.copyLink",
                  })
            }
            title={
              copied
                ? t("Copied", { $id: "secretSanta.hero.title.copied" })
                : t("Copy invite link", {
                    $id: "secretSanta.hero.title.copyLink",
                  })
            }
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>

          {showMenu && (
            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={t("Event actions", {
                  $id: "secretSanta.hero.aria.eventActions",
                })}
                title={t("More options", {
                  $id: "secretSanta.hero.title.moreOptions",
                })}
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
                      <span>
                        {t("Edit", { $id: "secretSanta.hero.menu.edit" })}
                      </span>
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
                      <span>
                        {t("Delete", { $id: "secretSanta.hero.menu.delete" })}
                      </span>
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
            {formatEventDate(event.event_date, locale ?? "en")}
          </span>
          <span className={styles.badge}>
            <DollarSign size={14} />
            {t("Budget {amount}", {
              amount: String(event.budget),
              $id: "secretSanta.hero.budgetBadge",
            })}
          </span>
          <span className={styles.badge}>
            <Users size={14} />
            {t("{count} people", {
              count: totalPeople,
              $id: "secretSanta.hero.peopleBadge",
            })}
          </span>
        </div>

        <div className={styles.heroCopy}>
          <div className={styles.titleRow}>
            <h1>{event.name}</h1>
            {isOwner && (
              <span className={styles.ownerPill}>
                <Crown size={14} />
                {t("You are the owner", {
                  $id: "secretSanta.hero.ownerPill",
                })}
              </span>
            )}
          </div>
          <p>
            {isOwner
              ? t(
                  "Track accepted participants, monitor pending invites, and get this exchange ready to launch.",
                  { $id: "secretSanta.hero.descriptionOwner" },
                )
              : t(
                  "See who joined the event, check the budget and date, and watch for your assigned receiver.",
                  { $id: "secretSanta.hero.descriptionGuest" },
                )}
          </p>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span>
              {t("Accepted participants", {
                $id: "secretSanta.hero.summary.accepted",
              })}
            </span>
            <strong>{event.participants.length}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>
              {t("Pending invites", {
                $id: "secretSanta.hero.summary.pending",
              })}
            </span>
            <strong>{event.pending_invites.length}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>
              {t("Budget per person", {
                $id: "secretSanta.hero.summary.budget",
              })}
            </span>
            <strong>{event.budget}</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
