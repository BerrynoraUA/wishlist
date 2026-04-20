"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useGT } from "gt-next";
import { useSubscription } from "@/hooks/use-subscription";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useUpdateWishlist } from "@/hooks/use-wishlists";
import { Wishlist } from "@/types/wishlist";
import { Check } from "lucide-react";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import {
  WISHLIST_COLOR_OPTIONS,
  WISHLIST_PRIVACY_BY_VISIBILITY,
  WISHLIST_VISIBILITY_BY_PRIVACY,
  getWishlistAccentByColor,
  getWishlistColorByAccent,
  getWishlistPrivacyOptions,
  type WishlistColorOption,
  type WishlistPrivacyOption,
} from "@/lib/helpers/wishlist-metadata";
import styles from "./CreateWishlistModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  wishlist: Wishlist;
};

export function EditWishlistModal({ open, onClose, wishlist }: Props) {
  if (!open) return null;

  return (
    <EditWishlistForm
      open={open}
      key={`${wishlist.id}-${wishlist.event_date ?? "no-date"}-${wishlist.image_url ?? "no-image"}`}
      wishlist={wishlist}
      onClose={onClose}
    />
  );
}

function EditWishlistForm({
  open,
  wishlist,
  onClose,
}: {
  open: boolean;
  wishlist: Wishlist;
  onClose: () => void;
}) {
  const t = useGT();
  const { isPro } = useSubscription();
  const privacyOptions = getWishlistPrivacyOptions(t);
  const isColorGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;
  const [name, setName] = useState(wishlist.title ?? "");
  const [description, setDescription] = useState(wishlist.description ?? "");
  const [privacy, setPrivacy] = useState<WishlistPrivacyOption>(
    WISHLIST_PRIVACY_BY_VISIBILITY[wishlist.visibility_type] ?? "Public",
  );
  const [color, setColor] = useState<WishlistColorOption>(
    getWishlistColorByAccent(wishlist.accent_type),
  );
  const [eventDate, setEventDate] = useState(() => {
    const raw =
      wishlist.event_date ??
      (wishlist as Wishlist & { event_date?: string }).event_date;
    return raw ? String(raw).split("T")[0] : "";
  });
  const [imagePreview, setImagePreview] = useState(wishlist.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const availableColors = useMemo(() => {
    if (!isColorGated) {
      return WISHLIST_COLOR_OPTIONS;
    }

    return color === "pink" ? (["pink"] as const) : ([color] as const);
  }, [color, isColorGated]);

  const { mutate, isPending } = useUpdateWishlist();

  const hasChanges = useMemo(() => {
    const initialTitle = wishlist.title?.trim() ?? "";
    const initialDescription = wishlist.description?.trim() ?? "";
    const initialPrivacy =
      WISHLIST_PRIVACY_BY_VISIBILITY[wishlist.visibility_type] ?? "Public";
    const initialColor = getWishlistColorByAccent(wishlist.accent_type);
    const initialEventDate = (() => {
      const raw =
        wishlist.event_date ??
        (wishlist as Wishlist & { event_date?: string }).event_date;
      return raw ? String(raw).split("T")[0] : "";
    })();
    const initialImage = wishlist.image_url ?? "";

    return (
      name.trim() !== initialTitle ||
      description.trim() !== initialDescription ||
      privacy !== initialPrivacy ||
      color !== initialColor ||
      eventDate !== initialEventDate ||
      Boolean(imageFile) ||
      imagePreview !== initialImage
    );
  }, [
    color,
    description,
    eventDate,
    imageFile,
    imagePreview,
    name,
    privacy,
    wishlist,
  ]);

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
    if (!name.trim() || isPending || !hasChanges) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    mutate(
      {
        id: wishlist.id,
        updates: {
          title: name.trim(),
          description: description.trim() || undefined,
          visibility: WISHLIST_VISIBILITY_BY_PRIVACY[privacy],
          image: imageFile,
          imageUrl: imageUrlToSave,
          accent: getWishlistAccentByColor(color),
          event_date: eventDate ? new Date(eventDate) : undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>{t("Edit Wishlist", { $id: "wishlist.modal.edit.title" })}</h2>
            <p>
              {t("Update your wishlist details and customize its appearance.", {
                $id: "wishlist.modal.edit.subtitle",
              })}
            </p>
          </div>
        </div>

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
              {t("Cover Image", { $id: "wishlist.modal.coverLabel" })}
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

        <div className={styles.field}>
          <label>
            {t("Event Date (optional)", {
              $id: "wishlist.modal.eventDateLabel",
            })}
          </label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

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

        <div className={styles.section}>
          <label>
            {t("Cover Color", { $id: "wishlist.modal.coverColor" })}
          </label>
          <div className={styles.colors}>
            {availableColors.map((c) => (
              <div
                key={c}
                className={`${styles.color} ${styles[c]} ${color === c ? styles.active : ""}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() || !hasChanges || isPending || Boolean(imageError)
            }
          >
            {isPending
              ? t("Saving...", { $id: "common.saving" })
              : t("Save Changes", { $id: "wishlist.modal.saveChanges" })}
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
