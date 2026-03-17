"use client";

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
  title = "Delete",
  description = "Are you sure? This action cannot be undone.",
  confirmLabel = "Delete",
  isPending = false,
}: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={24} />
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
