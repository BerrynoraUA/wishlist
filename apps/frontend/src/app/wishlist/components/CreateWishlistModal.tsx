"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import { useCreateWishlist } from "@/hooks/use-wishlists";
import { useSettings } from "@/hooks/use-settings";
import { Check } from "lucide-react";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import {
  WISHLIST_COLOR_OPTIONS,
  WISHLIST_VISIBILITY_BY_PRIVACY,
  getWishlistAccentByColor,
  getWishlistColorByIndex,
  getWishlistPrivacyOptions,
  type WishlistColorOption,
  type WishlistPrivacyOption,
} from "@/lib/helpers/wishlist-metadata";
import styles from "./CreateWishlistModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateWishlistModal({ open, onClose }: Props) {
  const { data: settings } = useSettings();
  const defaultColor = getWishlistColorByIndex(
    settings?.default_wishlist_color,
  );

  if (!open) return null;

  return (
    <CreateWishlistForm
      key={`create-wishlist-${defaultColor}`}
      defaultColor={defaultColor}
      onClose={onClose}
    />
  );
}

function CreateWishlistForm({
  defaultColor,
  onClose,
}: {
  defaultColor: WishlistColorOption;
  onClose: () => void;
}) {
  const t = useGT();
  const privacyOptions = getWishlistPrivacyOptions(t);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<WishlistPrivacyOption>("Public");
  const [color, setColor] = useState<WishlistColorOption>(defaultColor);
  const [eventDate, setEventDate] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateWishlist();

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrivacy("Public");
    setColor(defaultColor);
    setEventDate("");
    setImagePreview("");
    setImageFile(null);
    setImageError(null);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
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
  }

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    mutate(
      {
        title: name.trim(),
        description: description.trim() || undefined,
        visibility: WISHLIST_VISIBILITY_BY_PRIVACY[privacy],
        image: imageFile,
        imageUrl: imageUrlToSave,
        accent: getWishlistAccentByColor(color),
        event_date: eventDate ? new Date(eventDate) : undefined,
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
            <Heading>
              {t("Create New Wishlist", { $id: "wishlist.modal.create.title" })}
            </Heading>
            <Text variant="caption" tone="muted">
              {t("Give your wishlist a name and customize its appearance.", {
                $id: "wishlist.modal.create.subtitle",
              })}
            </Text>
          </div>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label>
            {t("Wishlist Name", { $id: "wishlist.modal.nameLabel" })}
          </label>
          <input
            placeholder={t("e.g. Birthday Wishes, Home Office Setup", {
              $id: "wishlist.modal.namePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label>
            {t("Description (optional)", {
              $id: "wishlist.modal.descriptionLabel",
            })}
          </label>
          <textarea
            placeholder={t("Add a note for your friends...", {
              $id: "wishlist.modal.descriptionPlaceholder",
            })}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label>
              {t("Cover Image (drag & drop or click)", {
                $id: "wishlist.modal.create.coverLabel",
              })}
            </label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t("Wishlist cover preview", {
                    $id: "wishlist.modal.coverAlt",
                  })}
                  className={styles.preview}
                />
              ) : (
                <span>
                  {t("Drop an image or click to upload", {
                    $id: "wishlist.modal.dropImage",
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

        {/* Event Date */}
        <div className={styles.field}>
          <label>
            {t("Event Date (optional)", {
              $id: "wishlist.modal.eventDateLabel",
            })}
          </label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

        {/* Privacy */}
        <div className={styles.section}>
          <label>{t("Privacy", { $id: "wishlist.modal.privacyLabel" })}</label>

          <div className={styles.privacyOptions}>
            {privacyOptions.map((option) => {
              const Icon = option.icon;

              return (
                <PrivacyCard
                  key={option.value}
                  icon={<Icon size={18} />}
                  title={option.title}
                  subtitle={option.subtitle}
                  selected={privacy === option.value}
                  onClick={() => setPrivacy(option.value)}
                />
              );
            })}
          </div>
        </div>

        {/* Colors */}
        <div className={styles.section}>
          <label>
            {t("Cover Color", { $id: "wishlist.modal.coverColor" })}
          </label>

          <div className={styles.colors}>
            {WISHLIST_COLOR_OPTIONS.map((c) => (
              <div
                key={c}
                className={`${styles.color} ${styles[c]} ${color === c ? styles.active : ""}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending || Boolean(imageError)}
          >
            {isPending
              ? t("Creating...", { $id: "wishlist.modal.creating" })
              : t("Create Wishlist", { $id: "wishlist.modal.create.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PrivacyCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.privacyCard} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    >
      <div className={styles.privacyIcon}>{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>

      {selected && (
        <div className={styles.check}>
          <Check size={16} />
        </div>
      )}
    </div>
  );
}
