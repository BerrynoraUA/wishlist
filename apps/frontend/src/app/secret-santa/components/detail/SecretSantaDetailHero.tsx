"use client";

import { useEffect, useRef, useState } from "react";
import { useGT, useLocale } from "gt-next";
import type { SecretSantaDetails } from "@/api/types/secret-santa";
import {
  CalendarDays,
  Check,
  Crown,
  DollarSign,
  MoreHorizontal,
  Pencil,
  TreePine,
  Upload,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import styles from "./SecretSantaDetailHero.module.scss";
import {
  formatEventDate,
  type SecretSantaAccent,
} from "./secretSantaDetail.utils";
import { Button } from "@/components/ui/Button/Button";
import { useUpdateSecretSantaEvent } from "@/hooks/use-secret-santa";
import { useCurrencyFormatter } from "@/hooks/use-currency";

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
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(event.name);
  const [imagePreview, setImagePreview] = useState(event.image_url ?? "");
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const showMenu = Boolean(onEdit || onDelete);
  const updateEvent = useUpdateSecretSantaEvent();
  const { formatPrice } = useCurrencyFormatter();

  useEffect(() => {
    if (!isInlineEditing) {
      setTitleDraft(event.name);
    }
  }, [event.name, isInlineEditing]);

  useEffect(() => {
    if (!imageObjectUrl) {
      setImagePreview(event.image_url ?? "");
    }
  }, [event.image_url, imageObjectUrl]);

  useEffect(() => {
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [imageObjectUrl]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function cancelInlineEditing() {
    setIsInlineEditing(false);
    setTitleDraft(event.name);
  }

  function saveInlineTitle() {
    const nextName = titleDraft.trim();
    if (!nextName || updateEvent.isPending) return;

    if (nextName === event.name) {
      setIsInlineEditing(false);
      return;
    }

    updateEvent.mutate(
      {
        eventId: event.id,
        updates: { name: nextName },
      },
      {
        onSuccess: () => setIsInlineEditing(false),
      },
    );
  }

  function handleTitleKeyDown(eventKey: React.KeyboardEvent<HTMLInputElement>) {
    if (eventKey.key === "Enter") {
      eventKey.preventDefault();
      saveInlineTitle();
    }

    if (eventKey.key === "Escape") {
      eventKey.preventDefault();
      cancelInlineEditing();
    }
  }

  function handleImageSelection(file?: File | null) {
    if (!file || updateEvent.isPending) return;

    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);
    setImagePreview(objectUrl);

    updateEvent.mutate(
      {
        eventId: event.id,
        updates: { image: file, imageUrl: null },
      },
      {
        onSuccess: () => {
          URL.revokeObjectURL(objectUrl);
          setImageObjectUrl(null);
        },
        onError: () => {
          URL.revokeObjectURL(objectUrl);
          setImageObjectUrl(null);
          setImagePreview(event.image_url ?? "");
        },
      },
    );
  }

  function handleFileChange(eventFile: React.ChangeEvent<HTMLInputElement>) {
    handleImageSelection(eventFile.target.files?.[0] ?? null);
    eventFile.target.value = "";
  }

  function handleDrop(eventDrop: React.DragEvent<HTMLLabelElement>) {
    eventDrop.preventDefault();
    setIsDragActive(false);
    handleImageSelection(eventDrop.dataTransfer.files?.[0] ?? null);
  }

  return (
    <section className={styles.hero}>
      {isOwner && (
        <div className={styles.heroActions}>
          <Button
            variant="accent"
            size="sm"
            className={styles.inviteButton}
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
            {copied ? <Check size={15} /> : <UserPlus size={15} />}
            <span>{copied ? "Copied" : "Invite Friends"}</span>
          </Button>

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
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt={event.name}
            className={styles.heroImage}
          />
        ) : isOwner ? (
          <label
            className={`${styles.heroUpload} ${isDragActive ? styles.heroUploadActive : ""} ${updateEvent.isPending ? styles.heroUploadPending : ""}`}
            onDragOver={(eventDrag) => {
              eventDrag.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.heroUploadInput}
              onChange={handleFileChange}
              disabled={updateEvent.isPending}
            />
            <Upload size={26} className={styles.heroUploadIcon} />
            <span className={styles.heroUploadTitle}>
              {updateEvent.isPending ? "Uploading cover..." : "Upload cover"}
            </span>
            <span className={styles.heroUploadHint}>
              Drag and drop or click to choose an image
            </span>
          </label>
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
              amount: formatPrice(event.budget, event.currency),
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
            {isInlineEditing ? (
              <div className={styles.inlineTitleBlock}>
                <input
                  className={styles.titleInput}
                  value={titleDraft}
                  onChange={(eventTitle) =>
                    setTitleDraft(eventTitle.target.value)
                  }
                  onKeyDown={handleTitleKeyDown}
                  placeholder="Event name"
                  autoFocus
                  disabled={updateEvent.isPending}
                />
                <div className={styles.inlineTitleActions}>
                  <button
                    type="button"
                    className={`${styles.inlineActionButton} ${styles.inlineCancelButton}`}
                    onClick={cancelInlineEditing}
                    disabled={updateEvent.isPending}
                    aria-label="Cancel title editing"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.inlineActionButton} ${styles.inlineSaveButton}`}
                    onClick={saveInlineTitle}
                    disabled={!titleDraft.trim() || updateEvent.isPending}
                    aria-label="Save event title"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1>{event.name}</h1>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.inlineEditTrigger}
                    onClick={() => setIsInlineEditing(true)}
                    aria-label="Inline edit event title"
                    title="Edit title"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </>
            )}
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
            <strong>{formatPrice(event.budget, event.currency)}</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
