"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateWishlist } from "@/hooks/use-wishlists";
import { useSettings } from "@/hooks/use-settings";
import { WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import { Globe, Users, Lock, Check } from "lucide-react";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import styles from "./CreateWishlistModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

type PrivacyOption = "Public" | "Friends" | "Private";
type ColorOption = "pink" | "peach" | "blue" | "lavender" | "mint";

const colors: ColorOption[] = ["pink", "peach", "blue", "lavender", "mint"];

const privacyToVisibility: Record<PrivacyOption, WishlistVisibility> = {
  Public: WishlistVisibility.Public,
  Friends: WishlistVisibility.FriendsOnly,
  Private: WishlistVisibility.Private,
};

const colorToAccent: Record<ColorOption, WishlistAccent> = {
  pink: WishlistAccent.Pink,
  peach: WishlistAccent.Peach,
  blue: WishlistAccent.Blue,
  lavender: WishlistAccent.Lavender,
  mint: WishlistAccent.Mint,
};

export function CreateWishlistModal({ open, onClose }: Props) {
  const { data: settings } = useSettings();
  const defaultColor: ColorOption =
    colors[settings?.default_wishlist_color ?? 0] ?? "pink";

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
  defaultColor: ColorOption;
  onClose: () => void;
}) {

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyOption>("Public");
  const [color, setColor] = useState<ColorOption>(defaultColor);
  const [eventDate, setEventDate] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);

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

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    mutate(
      {
        title: name.trim(),
        description: description.trim() || undefined,
        visibility: privacyToVisibility[privacy],
        image: imageFile,
        imageUrl: imageUrlToSave,
        accent: colorToAccent[color],
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
            <h2>Create New Wishlist</h2>
            <p>Give your wishlist a name and customize its appearance.</p>
          </div>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label>Wishlist Name</label>
          <input
            placeholder="e.g. Birthday Wishes, Home Office Setup"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label>Description (optional)</label>
          <textarea
            placeholder="Add a note for your friends..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Cover Image (drag & drop or click)</label>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Wishlist cover preview"
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

        {/* Event Date */}
        <div className={styles.field}>
          <label>Event Date (optional)</label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

        {/* Privacy */}
        <div className={styles.section}>
          <label>Privacy</label>

          <div className={styles.privacyOptions}>
            <PrivacyCard
              icon={<Globe size={18} />}
              title="Public"
              subtitle="Anyone can view"
              selected={privacy === "Public"}
              onClick={() => setPrivacy("Public")}
            />

            <PrivacyCard
              icon={<Users size={18} />}
              title="Friends Only"
              subtitle="Only your friends"
              selected={privacy === "Friends"}
              onClick={() => setPrivacy("Friends")}
            />

            <PrivacyCard
              icon={<Lock size={18} />}
              title="Private"
              subtitle="Only you"
              selected={privacy === "Private"}
              onClick={() => setPrivacy("Private")}
            />
          </div>
        </div>

        {/* Colors */}
        <div className={styles.section}>
          <label>Cover Color</label>

          <div className={styles.colors}>
            {colors.map((c) => (
              <div
                key={c}
                className={`${styles.color} ${styles[c]} ${
                  color === c ? styles.active : ""
                }`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? "Creating..." : "Create Wishlist"}
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
