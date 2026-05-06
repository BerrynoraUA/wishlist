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
  TreePine,
  Upload,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import styles from "./SecretSantaDetailHero.module.scss";
import { formatEventDate, type SecretSantaAccent } from "../../../helpers";
import { Button } from "@/components/ui/Button/Button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
import { useUpdateSecretSantaEvent } from "@/hooks/use-secret-santa";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";

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
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [isBudgetEditing, setIsBudgetEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(event.name);
  const [budgetDraft, setBudgetDraft] = useState(String(event.budget));
  const [imagePreview, setImagePreview] = useState(event.image_url ?? "");
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
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
    if (!isBudgetEditing) {
      setBudgetDraft(String(event.budget));
    }
  }, [event.budget, isBudgetEditing]);

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

  function cancelBudgetEditing() {
    setIsBudgetEditing(false);
    setBudgetDraft(String(event.budget));
  }

  function saveInlineBudget() {
    const nextBudget = Number(budgetDraft.trim());
    if (!Number.isFinite(nextBudget) || nextBudget < 0 || updateEvent.isPending) return;

    if (nextBudget === event.budget) {
      setIsBudgetEditing(false);
      return;
    }

    updateEvent.mutate(
      {
        eventId: event.id,
        updates: { budget: nextBudget },
      },
      {
        onSuccess: () => setIsBudgetEditing(false),
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

  function handleBudgetKeyDown(eventKey: React.KeyboardEvent<HTMLInputElement>) {
    if (eventKey.key === "Enter") {
      eventKey.preventDefault();
      saveInlineBudget();
    }

    if (eventKey.key === "Escape") {
      eventKey.preventDefault();
      cancelBudgetEditing();
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

  function handleDateChange(nextDate: string) {
    if (!nextDate || nextDate === event.event_date || updateEvent.isPending) return;

    updateEvent.mutate({
      eventId: event.id,
      updates: { event_date: nextDate },
    });
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
                ? t("Invite link copied", {
                    $id: "secretSanta.hero.title.linkCopied",
                  })
                : t("Copy invite link", {
                    $id: "secretSanta.hero.title.copyLink",
                  })
            }
          >
            {copied ? <Check size={15} /> : <UserPlus size={15} />}
            <span>
              {copied
                ? t("Copied", { $id: "secretSanta.hero.copied" })
                : t("Invite Friends", { $id: "secretSanta.hero.inviteFriends" })}
            </span>
          </Button>

          {showMenu && (
            <DropdownMenu
              trigger={({ toggle }) => (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={toggle}
                  aria-label={t("Event actions", {
                    $id: "secretSanta.hero.aria.eventActions",
                  })}
                  title={t("More options", {
                    $id: "secretSanta.hero.title.moreOptions",
                  })}
                >
                  <MoreHorizontal size={15} />
                </button>
              )}
            >
              {onEdit && (
                <DropdownMenuItem variant="edit" onClick={() => onEdit()}>
                  <span>{t("Edit", { $id: "secretSanta.hero.menu.edit" })}</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="danger" onClick={() => onDelete()}>
                  <span>{t("Delete", { $id: "secretSanta.hero.menu.delete" })}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          )}
        </div>
      )}

      <div className={`${styles.heroVisual} ${styles[accent]}`}>
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt={event.name} className={styles.heroImage} />
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
          </label>
        ) : (
          <TreePine size={52} className={styles.heroIcon} />
        )}
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.badges}>
          {isOwner ? (
            <DatePickerField
              value={event.event_date}
              onChange={handleDateChange}
              allowClear={false}
              disabled={updateEvent.isPending}
              showCloseButton={false}
              className={styles.datePickerBadgeWrap}
              triggerClassName={styles.datePickerBadge}
              calendarClassName={styles.datePickerCalendar}
            />
          ) : (
            <span className={styles.badge}>
              <CalendarDays size={14} />
              {formatEventDate(event.event_date, locale ?? "en")}
            </span>
          )}
          {isOwner && isBudgetEditing ? (
            <div className={styles.inlineBudgetBadge}>
              <DollarSign size={14} />
              <input
                className={styles.inlineBudgetInput}
                value={budgetDraft}
                onChange={(eventBudget) => setBudgetDraft(eventBudget.target.value)}
                onKeyDown={handleBudgetKeyDown}
                inputMode="decimal"
                autoFocus
                disabled={updateEvent.isPending}
                aria-label={t("Budget", { $id: "secretSanta.hero.budgetInputAria" })}
              />
              {event.currency ? <span className={styles.inlineBudgetCurrency}>{event.currency}</span> : null}
              <button
                type="button"
                className={`${styles.inlineActionButton} ${styles.inlineCancelButton} ${styles.inlineBudgetAction}`}
                onClick={cancelBudgetEditing}
                disabled={updateEvent.isPending}
                aria-label={t("Cancel budget editing", {
                  $id: "secretSanta.hero.cancelBudgetEditing",
                })}
              >
                <X size={12} />
              </button>
              <button
                type="button"
                className={`${styles.inlineActionButton} ${styles.inlineSaveButton} ${styles.inlineBudgetAction}`}
                onClick={saveInlineBudget}
                disabled={!budgetDraft.trim() || updateEvent.isPending}
                aria-label={t("Save budget", {
                  $id: "secretSanta.hero.saveBudget",
                })}
              >
                <Check size={12} />
              </button>
            </div>
          ) : (
            <div className={styles.tooltipTrigger}>
              <span
                className={`${styles.badge} ${isOwner ? styles.inlineBudgetTrigger : ""}`}
                onDoubleClick={isOwner ? () => setIsBudgetEditing(true) : undefined}
              >
                <DollarSign size={14} />
                {t("Budget {amount}", {
                  amount: formatPrice(event.budget, event.currency),
                  $id: "secretSanta.hero.budgetBadge",
                })}
              </span>
              {isOwner ? (
                <div className={styles.textTooltip} role="tooltip">
                  <div className={styles.textTooltipArrow} />
                  <span>
                    {t("Double-click to edit", {
                      $id: "secretSanta.hero.budget.doubleClickEdit",
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          )}
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
                  onChange={(eventTitle) => setTitleDraft(eventTitle.target.value)}
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
                <h1
                  className={isOwner ? styles.inlineTitleHeading : undefined}
                  onDoubleClick={isOwner ? () => setIsInlineEditing(true) : undefined}
                  title={
                    isOwner
                      ? t("Double-click to edit", {
                          $id: "secretSanta.hero.title.doubleClickEdit",
                        })
                      : undefined
                  }
                >
                  {event.name}
                </h1>
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
