"use client";

import { useEffect, useState } from "react";
import { useGT } from "gt-next";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Heading, Text, Eyebrow } from "@/components/ui/Typography";
import { AlertCircle, Check, CheckCircle2, Copy, Link2 } from "lucide-react";
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
  const t = useGT();
  const [copied, setCopied] = useState(false);
  const isSuccess = variant === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open, link]);

  async function handleCopyLink() {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={`${styles.iconWrapper} ${isSuccess ? styles.success : styles.error}`}>
          <Icon size={26} />
        </div>

        <div className={styles.content}>
          <Heading level={3}>{title}</Heading>
          <Text variant="subtitle" tone="muted">
            {description}
          </Text>
        </div>

        {link && (
          <div className={styles.linkCard}>
            <div className={styles.linkLabelRow}>
              <Link2 size={14} />
              <Eyebrow tone="muted">{t("Copied link", { $id: "share.copiedLink" })}</Eyebrow>
            </div>
            <p className={styles.linkValue}>{link}</p>
          </div>
        )}

        <div className={styles.footer}>
          {link && (
            <Button
              variant={copied ? "accent" : "secondary"}
              onClick={handleCopyLink}
              className={styles.copyButton}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied
                ? t("Copied", { $id: "common.copied" })
                : t("Copy link", { $id: "common.copyLink" })}
            </Button>
          )}
          <Button onClick={onClose}>
            {isSuccess ? t("Done", { $id: "common.done" }) : t("Close", { $id: "common.close" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
