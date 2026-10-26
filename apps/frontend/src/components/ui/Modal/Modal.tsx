"use client";

import styles from "./Modal.module.scss";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heading } from "../Typography";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  mobileFullscreen?: boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Only the most recently opened modal reacts to keys when modals are stacked. */
function isTopmost(dialog: HTMLElement) {
  const dialogs = document.querySelectorAll("[data-ui-modal]");
  return dialogs[dialogs.length - 1] === dialog;
}

export function Modal({ open, onClose, children, title, mobileFullscreen = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Most modals render their own heading inside `children`; name the dialog after it.
    if (!title) {
      const heading = dialog.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6");
      if (heading) {
        heading.id ||= `${titleId}-heading`;
        dialog.setAttribute("aria-labelledby", heading.id);
      }
    }

    // Focus the dialog itself rather than its first control: that avoids popping the
    // keyboard on phones and never lands on a destructive confirm button.
    if (!dialog.contains(document.activeElement)) dialog.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || !isTopmost(dialog)) return;

      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, mounted, title, titleId]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`${styles.overlay} ${mobileFullscreen ? styles.mobileFullscreenOverlay : ""}`}
      onClick={onClose}
      data-ui-modal-overlay
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`${styles.modal} ${mobileFullscreen ? styles.mobileFullscreenModal : ""}`}
        onClick={(e) => e.stopPropagation()}
        data-ui-modal
      >
        <div className={styles.content} data-ui-modal-content>
          {title && (
            <Heading level={3} className={styles.title} id={titleId}>
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
