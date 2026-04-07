"use client";

import { Lock, LockOpen, ShoppingCart, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import styles from "./ActionConfirmModal.module.scss";

export type ItemActionConfirmType =
  | "reserve"
  | "unreserve"
  | "purchase"
  | "unpurchase";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: ItemActionConfirmType;
  itemName?: string;
  isPending?: boolean;
};

const ACTION_COPY: Record<
  ItemActionConfirmType,
  {
    title: string;
    description: (itemName?: string) => string;
    confirmLabel: string;
    confirmVariant: "primary" | "secondary" | "danger" | "success" | "accent";
    toneClass: string;
    icon: LucideIcon;
  }
> = {
  reserve: {
    title: "Reserve this gift?",
    description: (itemName) =>
      itemName
        ? `This will reserve ${itemName} for you so other people know it is already taken.`
        : "This will reserve this gift for you so other people know it is already taken.",
    confirmLabel: "Reserve",
    confirmVariant: "primary",
    toneClass: "reserve",
    icon: LockOpen,
  },
  unreserve: {
    title: "Release reservation?",
    description: (itemName) =>
      itemName
        ? `This will remove your reservation from ${itemName} and make it available again.`
        : "This will remove your reservation and make the gift available again.",
    confirmLabel: "Release",
    confirmVariant: "danger",
    toneClass: "unreserve",
    icon: LockOpen,
  },
  purchase: {
    title: "Mark as purchased?",
    description: (itemName) =>
      itemName
        ? `This will mark ${itemName} as purchased by you.`
        : "This will mark this gift as purchased by you.",
    confirmLabel: "Mark purchased",
    confirmVariant: "success",
    toneClass: "purchase",
    icon: ShoppingCart,
  },
  unpurchase: {
    title: "Remove purchased status?",
    description: (itemName) =>
      itemName
        ? `This will remove the purchased status from ${itemName}.`
        : "This will remove the purchased status from this gift.",
    confirmLabel: "Remove status",
    confirmVariant: "danger",
    toneClass: "unpurchase",
    icon: ShoppingCart,
  },
};

export function ActionConfirmModal({
  open,
  onClose,
  onConfirm,
  action,
  itemName,
  isPending = false,
}: Props) {
  const config = ACTION_COPY[action];
  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={`${styles.iconWrapper} ${styles[config.toneClass]}`}>
          <Icon size={24} />
        </div>

        <h3 className={styles.title}>{config.title}</h3>
        <p className={styles.description}>{config.description(itemName)}</p>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Please wait..." : config.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
