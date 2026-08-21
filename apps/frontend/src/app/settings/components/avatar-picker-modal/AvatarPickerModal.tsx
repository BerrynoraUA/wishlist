"use client";

import { useGT } from "gt-next";
import { Check, Upload } from "lucide-react";
import { getDefaultAvatarUrls } from "@wishlist/backend/lib/default-avatars";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import styles from "./AvatarPickerModal.module.scss";

const DEFAULT_AVATAR_URLS = getDefaultAvatarUrls();

/**
 * Clicking the profile picture opens this: the ten default avatars to pick
 * from, or an upload of your own photo.
 */
export function AvatarPickerModal({
  open,
  selectedUrl,
  isSaving,
  onSelect,
  onUpload,
  onClose,
}: {
  open: boolean;
  selectedUrl: string | null | undefined;
  isSaving: boolean;
  onSelect: (url: string) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const t = useGT();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Profile photo", { $id: "settings.profile.avatarPickerTitle" })}
    >
      <p className={styles.description}>
        {t("Pick one of our avatars, or upload a photo of your own.", {
          $id: "settings.profile.avatarPickerDescription",
        })}
      </p>
      <div className={styles.grid}>
        {DEFAULT_AVATAR_URLS.map((url, index) => {
          const isSelected = url === selectedUrl;

          return (
            <button
              key={url}
              type="button"
              disabled={isSaving}
              aria-pressed={isSelected}
              aria-label={t("Avatar {number}", {
                number: index + 1,
                $id: "settings.profile.avatarPickerOption",
              })}
              className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`.trim()}
              onClick={() => onSelect(url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.optionImg} />
              {isSelected && (
                <span className={styles.optionCheck}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          {t("Cancel", { $id: "settings.profile.avatarPickerCancel" })}
        </Button>
        <Button onClick={onUpload} disabled={isSaving}>
          <Upload size={16} />
          {t("Upload a photo", { $id: "settings.profile.avatarPickerUpload" })}
        </Button>
      </div>
    </Modal>
  );
}
