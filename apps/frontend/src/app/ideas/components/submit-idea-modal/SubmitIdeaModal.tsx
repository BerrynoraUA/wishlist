"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateFeatureIdea } from "@/hooks/use-feature-ideas";
import { IDEA_DESCRIPTION_MAX_LENGTH, IDEA_TITLE_MAX_LENGTH } from "../../constants";
import styles from "../../ideas.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export function SubmitIdeaModal({ open, onClose, onSubmitted }: Props) {
  const t = useGT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createIdea = useCreateFeatureIdea();

  function handleSubmit() {
    if (!title.trim() || !description.trim() || createIdea.isPending) return;
    createIdea.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          onClose();
          onSubmitted();
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Submit a Feature Idea", { $id: "ideas.modal.title" })}
    >
      <div className={styles.form}>
        <label className={styles.fieldLabel}>
          {t("Title", { $id: "ideas.modal.titleLabel" })}
          <input
            className={styles.fieldInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("e.g. Dark mode calendar view", {
              $id: "ideas.modal.titlePlaceholder",
            })}
            maxLength={IDEA_TITLE_MAX_LENGTH}
          />
        </label>

        <label className={styles.fieldLabel}>
          {t("Description", { $id: "ideas.modal.descriptionLabel" })}
          <textarea
            className={styles.fieldTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Describe your idea and why it would be useful...", {
              $id: "ideas.modal.descriptionPlaceholder",
            })}
            maxLength={IDEA_DESCRIPTION_MAX_LENGTH}
          />
        </label>

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "ideas.modal.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || createIdea.isPending}
          >
            {createIdea.isPending
              ? t("Submitting...", { $id: "ideas.modal.submitting" })
              : t("Submit", { $id: "ideas.modal.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
