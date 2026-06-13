"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { Heading, Text } from "@/components/ui/Typography";
import { Select } from "@/components/ui/Select/Select";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCreateSecretSantaEvent } from "@/hooks/use-secret-santa";
import { useFriends } from "@/hooks/use-friends";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { useSettings } from "@/hooks/use-settings";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import { Search, X, UserPlus, Check } from "lucide-react";
import { getCompactCurrencyOptions, resolveCurrency } from "@/lib/helpers/form-select-options";
import { hasReachedSearchThreshold } from "@/lib/helpers/search";
import styles from "./CreateSecretSantaModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

type SelectedParticipant = {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CreateSecretSantaDraft = {
  name: string;
  eventDate: string;
  budget: string;
  currency: string;
  imagePreview: string;
  participants: SelectedParticipant[];
  hadLocalImage: boolean;
};

export function CreateSecretSantaModal({ open, onClose }: Props) {
  if (!open) return null;
  return <CreateSecretSantaForm onClose={onClose} />;
}

function CreateSecretSantaForm({ onClose }: { onClose: () => void }) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { data: settings } = useSettings();
  const preferredCurrency = resolveCurrency(settings?.display_currency);
  const currencyOptions = getCompactCurrencyOptions();
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState(preferredCurrency);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<SelectedParticipant[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [localImageNeedsReupload, setLocalImageNeedsReupload] = useState(false);

  const { mutate, isPending } = useCreateSecretSantaEvent();
  const { data: friends } = useFriends();
  const canSearchFriends = hasReachedSearchThreshold(friendSearch);

  const draftValue = useMemo<CreateSecretSantaDraft>(
    () => ({
      name,
      eventDate,
      budget,
      currency,
      imagePreview: imageFile ? "" : imagePreview,
      participants,
      hadLocalImage: Boolean(imageFile),
    }),
    [budget, currency, eventDate, imageFile, imagePreview, name, participants],
  );

  const isMeaningfulDraft = useCallback(
    (draft: CreateSecretSantaDraft) => {
      return Boolean(
        draft.name.trim() ||
        draft.eventDate ||
        draft.budget.trim() ||
        draft.currency !== preferredCurrency ||
        draft.imagePreview ||
        draft.participants.length > 0 ||
        draft.hadLocalImage,
      );
    },
    [preferredCurrency],
  );

  const applyDraft = useCallback(
    (draft: CreateSecretSantaDraft) => {
      setName(draft.name);
      setEventDate(draft.eventDate);
      setBudget(draft.budget);
      setCurrency(draft.currency || preferredCurrency);
      setImageObjectUrl(null);
      setImageFile(null);
      setImagePreview(draft.imagePreview);
      setImageError(null);
      setParticipants(draft.participants);
      setFriendSearch("");
      setLocalImageNeedsReupload(draft.hadLocalImage);
    },
    [preferredCurrency],
  );

  const { hasDraft, isDraftRestored, clearDraft } = useSessionDraft({
    userId: currentUserId,
    kind: "create-secret-santa",
    open: true,
    value: draftValue,
    onRestore: applyDraft,
    isMeaningful: isMeaningfulDraft,
  });

  const filteredFriends = (friends ?? []).filter((f) => {
    const alreadyAdded = participants.some((p) => p.user_id === f.friend_id);
    if (alreadyAdded) return false;
    if (!canSearchFriends) return true;
    const q = friendSearch.toLowerCase();
    return f.nickname?.toLowerCase().includes(q) || f.display_name?.toLowerCase().includes(q);
  });

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  function resetForm() {
    setName("");
    setEventDate("");
    setBudget("");
    setCurrency(preferredCurrency);
    setImagePreview("");
    setImageFile(null);
    setImageError(null);
    setParticipants([]);
    setFriendSearch("");
    setLocalImageNeedsReupload(false);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
  }

  function handleDiscardDraft() {
    clearDraft();
    resetForm();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextImageError = validateImageUploadFile(file);
    if (nextImageError) {
      setImageError(nextImageError);
      e.target.value = "";
      return;
    }

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);
    setImageError(null);
    setImageFile(file);
    setImagePreview(objectUrl);
    setLocalImageNeedsReupload(false);
  }

  function addParticipant(friend: {
    friend_id: string;
    nickname: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }) {
    setParticipants((prev) => [
      ...prev,
      {
        user_id: friend.friend_id,
        nickname: friend.nickname,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
      },
    ]);
  }

  function removeParticipant(userId: string) {
    setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
  }

  function handleSubmit() {
    if (!name.trim() || !eventDate || !budget || isPending) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    mutate(
      {
        name: name.trim(),
        event_date: eventDate,
        budget: parseFloat(budget),
        currency,
        image: imageFile,
        imageUrl: imageFile ? null : imagePreview || null,
        invited_user_ids: participants.map((p) => p.user_id),
      },
      {
        onSuccess: () => {
          clearDraft();
          resetForm();
          onClose();
        },
      },
    );
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal open onClose={handleClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Heading>
              {t("Create Secret Santa Event", {
                $id: "secretSanta.create.title",
              })}
            </Heading>
            <Text variant="caption" tone="muted">
              {t("Set up a gift exchange with your friends.", {
                $id: "secretSanta.create.subtitle",
              })}
            </Text>
          </div>
          {isDraftRestored && (
            <div className={styles.draftBanner}>
              <div className={styles.draftBannerMeta}>
                <DraftBadge label={t("Draft", { $id: "draft.badge" })} />
                <span>
                  {t("Draft restored for this event.", {
                    $id: "draft.secretSanta.restored",
                  })}
                </span>
              </div>
            </div>
          )}
          {isDraftRestored && localImageNeedsReupload && (
            <p className={styles.draftNote}>
              {t("Local image needs to be added again.", {
                $id: "draft.localImageReupload",
              })}
            </p>
          )}
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label>{t("Event Name", { $id: "secretSanta.create.eventNameLabel" })}</label>
          <input
            placeholder={t("e.g. Office Christmas Party, Family Gift Exchange", {
              $id: "secretSanta.create.eventNamePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Event Date */}
        <div className={styles.field}>
          <label>{t("Event Date", { $id: "secretSanta.create.eventDateLabel" })}</label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

        {/* Budget */}
        <div className={styles.field}>
          <label>{t("Budget", { $id: "secretSanta.create.budgetLabel" })}</label>
          <div className={styles.budgetRow}>
            <input
              type="number"
              placeholder={t("e.g. 25", {
                $id: "secretSanta.create.budgetPlaceholder",
              })}
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <Select
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              ariaLabel={t("Currency", { $id: "item.modal.currencyAria" })}
              triggerClassName={styles.currencySelect}
            />
          </div>
        </div>

        {/* Cover Image */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label>
              {t("Cover Image (optional)", {
                $id: "secretSanta.create.coverLabel",
              })}
            </label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t("Event cover preview", {
                    $id: "secretSanta.create.coverAlt",
                  })}
                  className={styles.preview}
                />
              ) : (
                <span>
                  {t("Drop an image or click to upload", {
                    $id: "secretSanta.create.coverDrop",
                  })}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </label>
          </div>
          <UploadErrorText message={imageError} />
        </div>

        {/* Participants */}
        <div className={styles.section}>
          <label>{t("Participants", { $id: "secretSanta.create.participantsLabel" })}</label>

          {participants.length > 0 && (
            <div className={styles.participantsList}>
              {participants.map((p) => (
                <div key={p.user_id} className={styles.participantChip}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className={styles.chipAvatar} />
                  ) : (
                    <span className={styles.chipInitial}>
                      {(p.display_name ?? p.nickname ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>
                    {p.display_name ??
                      p.nickname ??
                      t("User", { $id: "secretSanta.create.userFallback" })}
                  </span>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => removeParticipant(p.user_id)}
                    aria-label={t("Remove participant", {
                      $id: "secretSanta.create.removeParticipantAria",
                    })}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.friendSearch}>
            <Search size={14} />
            <input
              placeholder={t("Search friends to add...", {
                $id: "secretSanta.create.searchFriendsPlaceholder",
              })}
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          <div className={styles.friendList}>
            {filteredFriends.length === 0 && (
              <p className={styles.noFriends}>
                {t("No friends to add", {
                  $id: "secretSanta.create.noFriends",
                })}
              </p>
            )}
            {filteredFriends.slice(0, 8).map((f) => {
              const isSelected = participants.some((p) => p.user_id === f.friend_id);

              return (
                <button
                  key={f.friend_id}
                  type="button"
                  className={`${styles.friendItem} ${isSelected ? styles.friendItemSelected : ""}`}
                  onClick={() => addParticipant(f)}
                  disabled={isSelected}
                >
                  <div className={styles.friendAvatar}>
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" />
                    ) : (
                      (f.display_name ?? f.nickname ?? "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles.friendInfo}>
                    <strong>
                      {f.display_name ??
                        f.nickname ??
                        t("User", {
                          $id: "secretSanta.create.friendUserFallback",
                        })}
                    </strong>
                    {f.nickname && f.display_name && <span>@{f.nickname}</span>}
                  </div>
                  {isSelected ? (
                    <Check size={16} className={styles.friendAction} />
                  ) : (
                    <UserPlus size={16} className={styles.friendAction} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {hasDraft && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.draftFooterAction}
              onClick={handleDiscardDraft}
            >
              {t("Discard draft", { $id: "draft.discardAction" })}
            </Button>
          )}
          <Button variant="secondary" onClick={handleClose}>
            {t("Cancel", { $id: "secretSanta.create.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !eventDate || !budget || isPending || Boolean(imageError)}
          >
            {isPending
              ? t("Creating...", { $id: "secretSanta.create.creating" })
              : t("Create Event", { $id: "secretSanta.create.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
