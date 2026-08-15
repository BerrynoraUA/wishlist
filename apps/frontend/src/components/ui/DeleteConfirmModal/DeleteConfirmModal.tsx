"use client";

import type { ReactNode } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import { AlertTriangle } from "lucide-react";
import styles from "./DeleteConfirmModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
  /** Rendered between the description and the buttons, e.g. an extra option. */
  extraContent?: ReactNode;
};

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isPending = false,
  extraContent,
}: Props) {
  const t = useGT();
  const resolvedTitle = title ?? t("Delete", { $id: "confirm.delete.title" });
  const resolvedDescription =
    description ??
    t("Are you sure? This action cannot be undone.", {
      $id: "confirm.delete.description",
    });
  const resolvedConfirm = confirmLabel ?? t("Delete", { $id: "confirm.delete.confirm" });

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={24} />
        </div>

        <Heading level={3}>{resolvedTitle}</Heading>
        <Text variant="subtitle" tone="muted">
          {resolvedDescription}
        </Text>

        {extraContent}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? t("Deleting...", { $id: "confirm.delete.deleting" }) : resolvedConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
