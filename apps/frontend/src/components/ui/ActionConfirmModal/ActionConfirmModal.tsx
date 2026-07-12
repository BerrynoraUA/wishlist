"use client";

import { useMemo } from "react";
import { Lock, LockOpen, ShoppingCart } from "lucide-react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import styles from "./ActionConfirmModal.module.scss";

export type ItemActionConfirmType = "reserve" | "unreserve" | "purchase" | "unpurchase";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: ItemActionConfirmType;
  itemName?: string;
  isPending?: boolean;
};

type ActionMeta = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "primary" | "secondary" | "danger" | "success" | "accent";
  toneClass: string;
  icon: typeof ShoppingCart;
};

export function ActionConfirmModal({
  open,
  onClose,
  onConfirm,
  action,
  itemName,
  isPending = false,
}: Props) {
  const t = useGT();

  const config = useMemo((): ActionMeta => {
    const name = itemName?.trim();
    switch (action) {
      case "reserve":
        return {
          title: t("Reserve this gift?", { $id: "action.reserve.title" }),
          description: name
            ? t("This will reserve {itemName} for you so other people know it is already taken.", {
                itemName: name,
                $id: "action.reserve.bodyWithName",
              })
            : t("This will reserve this gift for you so other people know it is already taken.", {
                $id: "action.reserve.body",
              }),
          confirmLabel: t("Reserve", { $id: "action.reserve.confirm" }),
          confirmVariant: "primary",
          toneClass: "reserve",
          icon: LockOpen,
        };
      case "unreserve":
        return {
          title: t("Release reservation?", { $id: "action.unreserve.title" }),
          description: name
            ? t("This will remove your reservation from {itemName} and make it available again.", {
                itemName: name,
                $id: "action.unreserve.bodyWithName",
              })
            : t("This will remove your reservation and make the gift available again.", {
                $id: "action.unreserve.body",
              }),
          confirmLabel: t("Release", { $id: "action.unreserve.confirm" }),
          confirmVariant: "danger",
          toneClass: "unreserve",
          icon: Lock,
        };
      case "purchase":
        return {
          title: t("Mark as purchased?", { $id: "action.purchase.title" }),
          description: name
            ? t("This will mark {itemName} as purchased by you.", {
                itemName: name,
                $id: "action.purchase.bodyWithName",
              })
            : t("This will mark this gift as purchased by you.", {
                $id: "action.purchase.body",
              }),
          confirmLabel: t("Mark purchased", {
            $id: "action.purchase.confirm",
          }),
          confirmVariant: "primary",
          toneClass: "purchase",
          icon: ShoppingCart,
        };
      case "unpurchase":
        return {
          title: t("Remove purchased status?", {
            $id: "action.unpurchase.title",
          }),
          description: name
            ? t("This will remove the purchased status from {itemName}.", {
                itemName: name,
                $id: "action.unpurchase.bodyWithName",
              })
            : t("This will remove the purchased status from this gift.", {
                $id: "action.unpurchase.body",
              }),
          confirmLabel: t("Remove status", {
            $id: "action.unpurchase.confirm",
          }),
          confirmVariant: "danger",
          toneClass: "unpurchase",
          icon: ShoppingCart,
        };
    }
  }, [action, itemName, t]);

  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={`${styles.iconWrapper} ${styles[config.toneClass]}`}>
          <Icon size={24} />
        </div>

        <Heading level={3}>{config.title}</Heading>
        <Text variant="subtitle" tone="secondary">
          {config.description}
        </Text>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button variant={config.confirmVariant} onClick={onConfirm} disabled={isPending}>
            {isPending ? t("Please wait...", { $id: "common.pleaseWait" }) : config.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
