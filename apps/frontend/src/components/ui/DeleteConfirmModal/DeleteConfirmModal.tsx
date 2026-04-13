"use client";

import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
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
};

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isPending = false,
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

        <h3 className={styles.title}>{resolvedTitle}</h3>
        <p className={styles.description}>{resolvedDescription}</p>

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
