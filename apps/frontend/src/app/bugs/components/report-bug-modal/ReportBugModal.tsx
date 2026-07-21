"use client";

import { useEffect, useRef, useState } from "react";
import { useGT } from "gt-next";
import { ImagePlus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateBugReport } from "@/hooks/use-bug-reports";
import { MAX_IMAGE_UPLOAD_LABEL, validateImageUploadFile } from "@/lib/image-upload";
import { BUG_DESCRIPTION_MAX_LENGTH, BUG_TITLE_MAX_LENGTH } from "../../constants";
import styles from "../../bugs.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReportBugModal({ open, onClose, onSubmitted }: Props) {
  const t = useGT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createReport = useCreateBugReport();

  useEffect(() => {
    if (!screenshot) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  function handleScreenshotChange(file: File | null) {
    const error = validateImageUploadFile(file);
    setScreenshotError(error);
    setScreenshot(error ? null : file);
  }

  function clearScreenshot() {
    setScreenshot(null);
    setScreenshotError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    if (!title.trim() || !description.trim() || createReport.isPending) return;
    createReport.mutate(
      { title: title.trim(), description: description.trim(), screenshot },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          clearScreenshot();
          onClose();
          onSubmitted();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Report a Bug", { $id: "bugs.modal.title" })}>
      <div className={styles.form}>
        <label className={styles.fieldLabel}>
          {t("Title", { $id: "bugs.modal.titleLabel" })}
          <input
            className={styles.fieldInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("e.g. Wishlist items disappear after editing", {
              $id: "bugs.modal.titlePlaceholder",
            })}
            maxLength={BUG_TITLE_MAX_LENGTH}
          />
        </label>

        <label className={styles.fieldLabel}>
          {t("Description", { $id: "bugs.modal.descriptionLabel" })}
          <textarea
            className={styles.fieldTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("What happened, and what did you expect instead?", {
              $id: "bugs.modal.descriptionPlaceholder",
            })}
            maxLength={BUG_DESCRIPTION_MAX_LENGTH}
          />
        </label>

        <div className={styles.fieldLabel}>
          <span className={styles.screenshotLabelRow}>
            {t("Screenshot (optional)", { $id: "bugs.modal.screenshotLabel" })}
            <span className={styles.screenshotHint}>{MAX_IMAGE_UPLOAD_LABEL}</span>
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={(e) => handleScreenshotChange(e.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <div className={styles.screenshotPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className={styles.screenshotPreviewImage} />
              <button
                type="button"
                className={styles.screenshotRemove}
                onClick={clearScreenshot}
                aria-label={t("Remove screenshot", { $id: "bugs.modal.removeScreenshot" })}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.screenshotPicker}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={16} />
              {t("Attach a screenshot", { $id: "bugs.modal.attachScreenshot" })}
            </button>
          )}

          {screenshotError && <p className={styles.fieldError}>{screenshotError}</p>}
        </div>

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "bugs.modal.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || createReport.isPending}
          >
            {createReport.isPending
              ? t("Submitting...", { $id: "bugs.modal.submitting" })
              : t("Submit", { $id: "bugs.modal.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
