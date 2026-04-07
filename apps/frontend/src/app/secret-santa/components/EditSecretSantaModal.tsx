"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useUpdateSecretSantaEvent } from "@/hooks/use-secret-santa";
import type { SecretSantaDetails } from "@/api/types/secret-santa";
import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import styles from "./CreateSecretSantaModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  event: SecretSantaDetails;
};

export function EditSecretSantaModal({ open, onClose, event }: Props) {
  if (!open) return null;

  return (
    <EditSecretSantaForm
      key={`${event.id}-${event.image_url ?? "no-image"}-${event.budget}`}
      event={event}
      onClose={onClose}
    />
  );
}

function EditSecretSantaForm({
  event,
  onClose,
}: {
  event: SecretSantaDetails;
  onClose: () => void;
}) {
  const [name, setName] = useState(event.name ?? "");
  const [budget, setBudget] = useState(String(event.budget ?? ""));
  const [currency, setCurrency] = useState(
    normalizeCurrencyCode(event.currency),
  );
  const [imagePreview, setImagePreview] = useState(event.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);

  const { mutate, isPending } = useUpdateSecretSantaEvent();

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);
    setImageFile(file);
    setImagePreview(objectUrl);
  }

  function handleSubmit() {
    if (!name.trim() || !budget || isPending) return;

    mutate(
      {
        eventId: event.id,
        updates: {
          name: name.trim(),
          budget: parseFloat(budget),
          currency,
          image: imageFile,
          imageUrl: imageFile ? null : imagePreview || null,
        },
      },
      {
        onSuccess: () => onClose(),
      },
    );
  }

  return (
    <Modal open onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>Edit Secret Santa Event</h2>
            <p>Update the event details without changing participants.</p>
          </div>
        </div>

        <div className={styles.field}>
          <label>Event Name</label>
          <input
            placeholder="e.g. Office Christmas Party, Family Gift Exchange"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !budget || isPending}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
