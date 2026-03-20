"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useUpdateWishlist } from "@/hooks/use-wishlists";
import { Wishlist, WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import { Globe, Users, Lock, Check } from "lucide-react";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
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
      key={`${wishlist.id}-${wishlist.event_date ?? "no-date"}`}
      wishlist={wishlist}
      onClose={onClose}
    />
  );
}

type PrivacyOption = "Public" | "Friends" | "Private";
type ColorOption = "pink" | "peach" | "blue" | "lavender" | "mint";

const colors: ColorOption[] = ["pink", "peach", "blue", "lavender", "mint"];

const visibilityToPrivacy: Record<WishlistVisibility, PrivacyOption> = {
  [WishlistVisibility.Public]: "Public",
  [WishlistVisibility.FriendsOnly]: "Friends",
  [WishlistVisibility.Private]: "Private",
};

const privacyToVisibility: Record<PrivacyOption, WishlistVisibility> = {
  Public: WishlistVisibility.Public,
  Friends: WishlistVisibility.FriendsOnly,
  Private: WishlistVisibility.Private,
};

const accentToColor: Record<WishlistAccent, ColorOption> = {
  [WishlistAccent.Pink]: "pink",
  [WishlistAccent.Blue]: "blue",
  [WishlistAccent.Peach]: "peach",
  [WishlistAccent.Mint]: "mint",
  [WishlistAccent.Lavender]: "lavender",
};

const colorToAccent: Record<ColorOption, WishlistAccent> = {
  pink: WishlistAccent.Pink,
  peach: WishlistAccent.Peach,
  blue: WishlistAccent.Blue,
  lavender: WishlistAccent.Lavender,
  mint: WishlistAccent.Mint,
};

function EditWishlistForm({
  open,
  wishlist,
  onClose,
}: {
  open: boolean;
  wishlist: Wishlist;
  onClose: () => void;
}) {
  const [name, setName] = useState(wishlist.title ?? "");
  const [description, setDescription] = useState(wishlist.description ?? "");
  const [privacy, setPrivacy] = useState<PrivacyOption>(
    visibilityToPrivacy[wishlist.visibility_type] ?? "Public",
  );
  const [color, setColor] = useState<ColorOption>(
    accentToColor[wishlist.accent_type] ?? "pink",
  );
  const [eventDate, setEventDate] = useState(() => {
    const raw =
      wishlist.event_date ??
      (wishlist as Wishlist & { event_date?: string }).event_date;
    return raw ? String(raw).split("T")[0] : "";
  });

  const { mutate, isPending } = useUpdateWishlist();

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    mutate(
      {
        id: wishlist.id,
        updates: {
          title: name.trim(),
          description: description.trim() || undefined,
          visibility: privacyToVisibility[privacy],
          accent: colorToAccent[color],
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
            <h2>Edit Wishlist</h2>
            <p>Update your wishlist details and customize its appearance.</p>
          </div>
        </div>

        <div className={styles.field}>
          <label>Wishlist Name</label>
          <input
            placeholder="e.g. Birthday Wishes, Home Office Setup"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Description (optional)</label>
          <textarea
            placeholder="Add a note for your friends..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Event Date (optional)</label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

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

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? "Saving..." : "Save Changes"}
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
