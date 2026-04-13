"use client";

import { useEffect, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { useUpdateSecretSantaEvent } from "@/hooks/use-secret-santa";
import type { SecretSantaDetails } from "@/api/types/secret-santa";
import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { validateImageUploadFile } from "@/lib/image-upload";
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
  const t = useGT();
  const [name, setName] = useState(event.name ?? "");
  const [budget, setBudget] = useState(String(event.budget ?? ""));
  const [currency, setCurrency] = useState(
    normalizeCurrencyCode(event.currency),
  );
  const [imagePreview, setImagePreview] = useState(event.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const { mutate, isPending } = useUpdateSecretSantaEvent();

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

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
  }

  function handleSubmit() {
    if (!name.trim() || !budget || isPending) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

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
            <h2>
              {t("Edit Secret Santa Event", {
                $id: "secretSanta.edit.title",
              })}
            </h2>
            <p>
              {t("Update the event details without changing participants.", {
                $id: "secretSanta.edit.subtitle",
              })}
            </p>
          </div>
        </div>

        <div className={styles.field}>
          <label>
            {t("Event Name", { $id: "secretSanta.edit.eventNameLabel" })}
          </label>
          <input
            placeholder={t(
              "e.g. Office Christmas Party, Family Gift Exchange",
              { $id: "secretSanta.edit.eventNamePlaceholder" },
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>{t("Budget", { $id: "secretSanta.edit.budgetLabel" })}</label>
          <div className={styles.budgetRow}>
            <input
              type="number"
              placeholder={t("e.g. 25", {
                $id: "secretSanta.edit.budgetPlaceholder",
              })}
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
          <div className={styles.labelRow}>
            <label>
              {t("Cover Image (optional)", {
                $id: "secretSanta.edit.coverLabel",
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
                    $id: "secretSanta.edit.coverAlt",
                  })}
                  className={styles.preview}
                />
              ) : (
                <span>
                  {t("Drop an image or click to upload", {
                    $id: "secretSanta.edit.coverDrop",
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

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel", { $id: "secretSanta.edit.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() || !budget || isPending || Boolean(imageError)
            }
          >
            {isPending
              ? t("Saving...", { $id: "secretSanta.edit.saving" })
              : t("Save Changes", { $id: "secretSanta.edit.save" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
