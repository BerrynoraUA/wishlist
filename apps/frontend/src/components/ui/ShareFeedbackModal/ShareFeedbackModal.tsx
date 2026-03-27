"use client";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { AlertCircle, CheckCircle2, Link2 } from "lucide-react";
import styles from "./ShareFeedbackModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: "success" | "error";
  title: string;
  description: string;
  link?: string | null;
};

export function ShareFeedbackModal({
  open,
  onClose,
  variant = "success",
  title,
  description,
  link,
}: Props) {
  const isSuccess = variant === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div
          className={`${styles.iconWrapper} ${isSuccess ? styles.success : styles.error}`}
        >
          <Icon size={26} />
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>

        {link && (
          <div className={styles.linkCard}>
            <div className={styles.linkLabelRow}>
              <Link2 size={14} />
              <span>Copied link</span>
            </div>
            <p className={styles.linkValue}>{link}</p>
          </div>
        )}

        <div className={styles.footer}>
          <Button onClick={onClose}>{isSuccess ? "Done" : "Close"}</Button>
        </div>
      </div>
    </Modal>
  );
}
