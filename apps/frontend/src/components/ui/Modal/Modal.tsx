"use client";

import styles from "./Modal.module.scss";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heading } from "../Typography";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function Modal({ open, onClose, children, title }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          {title && (
            <Heading level={3} className={styles.title}>
              {title}
            </Heading>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
