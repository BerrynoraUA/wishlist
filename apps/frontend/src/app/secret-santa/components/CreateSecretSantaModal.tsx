"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateSecretSantaEvent } from "@/hooks/use-secret-santa";
import { useFriends } from "@/hooks/use-friends";
import { useSettings } from "@/hooks/use-settings";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { Search, X, UserPlus, Check } from "lucide-react";
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

export function CreateSecretSantaModal({ open, onClose }: Props) {
  if (!open) return null;
  return <CreateSecretSantaForm onClose={onClose} />;
}

function CreateSecretSantaForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [participants, setParticipants] = useState<SelectedParticipant[]>([]);
  const [friendSearch, setFriendSearch] = useState("");

  const { mutate, isPending } = useCreateSecretSantaEvent();
  const { data: friends } = useFriends();
  const { data: settings } = useSettings();

  useEffect(() => {
    setCurrency(normalizeCurrencyCode(settings?.display_currency));
  }, [settings?.display_currency]);

  const filteredFriends = (friends ?? []).filter((f) => {
    const alreadyAdded = participants.some((p) => p.user_id === f.friend_id);
    if (alreadyAdded) return false;
    if (!friendSearch.trim()) return true;
    const q = friendSearch.toLowerCase();
    return (
      f.nickname?.toLowerCase().includes(q) ||
      f.display_name?.toLowerCase().includes(q)
    );
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
    setCurrency(normalizeCurrencyCode(settings?.display_currency));
    setImagePreview("");
    setImageFile(null);
    setParticipants([]);
    setFriendSearch("");
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);
    setImageFile(file);
    setImagePreview(objectUrl);
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
          resetForm();
          onClose();
        },
      },
    );
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal open onClose={handleClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>Create Secret Santa Event</h2>
            <p>Set up a gift exchange with your friends.</p>
          </div>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label>Event Name</label>
          <input
            placeholder="e.g. Office Christmas Party, Family Gift Exchange"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Event Date */}
        <div className={styles.field}>
          <label>Event Date</label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

        {/* Budget */}
        <div className={styles.field}>
          <label>Budget</label>
          <div className={styles.budgetRow}>
            <input
              type="number"
              placeholder="e.g. 25"
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <select
              className={styles.currencySelect}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover Image */}
        <div className={styles.field}>
          <label>Cover Image (optional)</label>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Event cover preview"
                  className={styles.preview}
                />
              ) : (
                <span>Drop an image or click to upload</span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </label>
          </div>
        </div>

        {/* Participants */}
        <div className={styles.section}>
          <label>Participants</label>

          {participants.length > 0 && (
            <div className={styles.participantsList}>
              {participants.map((p) => (
                <div key={p.user_id} className={styles.participantChip}>
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className={styles.chipAvatar}
                    />
                  ) : (
                    <span className={styles.chipInitial}>
                      {(p.display_name ?? p.nickname ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span>{p.display_name ?? p.nickname ?? "User"}</span>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => removeParticipant(p.user_id)}
                    aria-label="Remove participant"
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
              placeholder="Search friends to add..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          <div className={styles.friendList}>
            {filteredFriends.length === 0 && (
              <p className={styles.noFriends}>No friends to add</p>
            )}
            {filteredFriends.slice(0, 8).map((f) => {
              const isSelected = participants.some(
                (p) => p.user_id === f.friend_id,
              );

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
                      (f.display_name ?? f.nickname ?? "?")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div className={styles.friendInfo}>
                    <strong>{f.display_name ?? f.nickname ?? "User"}</strong>
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
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() ||
              !eventDate ||
              !budget ||
              participants.length === 0 ||
              isPending
            }
          >
            {isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
