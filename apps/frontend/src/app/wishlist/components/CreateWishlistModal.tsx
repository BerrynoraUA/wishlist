"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateWishlist } from "@/hooks/use-wishlists";
import { useSettings } from "@/hooks/use-settings";
import { WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import { Globe, Users, Lock, Check } from "lucide-react";
import styles from "./CreateWishlistModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateWishlistModal({ open, onClose }: Props) {
  const colors = ["pink", "peach", "blue", "lavender", "mint"] as const;
  type ColorOption = (typeof colors)[number];
  type PrivacyOption = "Public" | "Friends" | "Private";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyOption>("Public");
  const [color, setColor] = useState<ColorOption>("pink");
  const [eventDate, setEventDate] = useState("");

  const { mutate, isPending } = useCreateWishlist();
  const { data: settings } = useSettings();

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

  const defaultColor: ColorOption =
    colors[settings?.default_wishlist_color ?? 0] ?? "pink";

  useEffect(() => {
    if (!open) return;
    setColor(defaultColor);
  }, [defaultColor, open]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrivacy("Public");
    setColor(defaultColor);
    setEventDate("");
  }

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    mutate(
      {
        title: name.trim(),
        description: description.trim() || undefined,
        visibility: privacyToVisibility[privacy],
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

  return (
    <Modal open={open} onClose={onClose}>
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

          {/* Event Date */}
          <div className={styles.field}>
            <label>Event Date (optional)</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
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
          <Button variant="secondary" onClick={onClose}>
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

function PrivacyCard({ icon, title, subtitle, selected, onClick }: any) {
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
