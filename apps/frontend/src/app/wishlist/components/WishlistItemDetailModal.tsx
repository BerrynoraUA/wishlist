"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Item } from "@/types/item";
import { ExternalLink, Trash2, Pencil, ShoppingCart } from "lucide-react";
import styles from "./WishlistItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";

type Props = {
  open: boolean;
  onClose: () => void;
  item: Item;
  isOwner?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  reservedByName?: string | null;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
};

export function WishlistItemDetailModal({
  open,
  onClose,
  item,
  isOwner = false,
  onToggleReserve,
  onToggleBought,
  reservedByName,
  onDelete,
  onEdit,
}: Props) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { formatPrice } = useCurrencyFormatter();
  const [confirmAction, setConfirmAction] =
    useState<ItemActionConfirmType | null>(null);
  const isPurchased = item.status === 2;
  const isReserved = item.status === 1 || (!isPurchased && !!item.reserved_by);
  const reservedByMe = currentUserId
    ? item.reserved_by === currentUserId
    : false;
  const canToggleReservation =
    !isOwner && !isPurchased && (!isReserved || reservedByMe);
  const canToggleBought =
    !isOwner &&
    ((isPurchased && reservedByMe) ||
      (!isPurchased && (!isReserved || reservedByMe)));

  const priorityLabel = useMemo(
    () => ({
      1: t("Low", { $id: "item.priority.low" }),
      2: t("Medium", { $id: "item.priority.medium" }),
      3: t("High", { $id: "item.priority.high" }),
    }),
    [t],
  );

  const reserveStatusLabel = isPurchased
    ? reservedByMe
      ? t("Purchased by you", { $id: "item.status.purchasedByYou" })
      : reservedByName
        ? t("Purchased by {name}", {
            name: reservedByName,
            $id: "item.status.purchasedByName",
          })
        : t("Purchased", { $id: "item.status.purchased" })
    : isReserved
      ? reservedByMe
        ? t("Reserved by you", { $id: "item.status.reservedByYou" })
        : reservedByName
          ? t("Reserved by {name}", {
              name: reservedByName,
              $id: "item.status.reservedByName",
            })
          : t("Reserved", { $id: "item.status.reserved" })
      : null;

  const handleReserveClick = () => {
    if (!canToggleReservation || !onToggleReserve) return;
    setConfirmAction(isReserved ? "unreserve" : "reserve");
  };

  const handleBoughtClick = () => {
    if (!canToggleBought || !onToggleBought) return;
    setConfirmAction(isPurchased ? "unpurchase" : "purchase");
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction === "reserve" || confirmAction === "unreserve") {
      onToggleReserve?.(item.id);
    } else {
      onToggleBought?.(item.id);
    }

    setConfirmAction(null);
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div className={styles.container}>
          {item.image_url && (
            <div className={styles.imageSection}>
              <img src={item.image_url} alt={item.name} />
            </div>
          )}

          <div className={styles.details}>
            <div className={styles.tooltipTrigger}>
              <div className={styles.titleBlock}>
                <h2>{item.name}</h2>
              </div>
              <div className={styles.textTooltip} role="tooltip">
                <div className={styles.textTooltipArrow} />
                <strong>{item.name}</strong>
              </div>
            </div>

            {item.description && (
              <p className={styles.descriptionFull}>{item.description}</p>
            )}

            <div className={styles.meta}>
              {item.price && (
                <span className={styles.price}>
                  {formatPrice(item.price, item.currency)}
                </span>
              )}
              {item.priority != null &&
                priorityLabel[item.priority as 1 | 2 | 3] && (
                  <span className={styles.priority}>
                    {priorityLabel[item.priority as 1 | 2 | 3]}
                  </span>
                )}
              {reserveStatusLabel && (
                <span className={styles.reservedBadge}>
                  {reserveStatusLabel}
                </span>
              )}
            </div>

            <div className={styles.footer}>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkBtn}
                >
                  <ExternalLink size={14} />
                  <span>
                    {t("Visit website", { $id: "item.detail.visitWebsite" })}
                  </span>
                </a>
              )}

              {!isOwner && (
                <SaveToWishlistButton
                  item={{
                    name: item.name,
                    description: item.description ?? null,
                    price: item.price ?? null,
                    image_url: item.image_url ?? null,
                    url: item.url ?? null,
                    priority: item.priority ?? null,
                    discount_price: item.discount_price ?? null,
                    has_discount: item.has_discount ?? false,
                    discount_end_date: item.discount_end_date ?? null,
                    currency: item.currency ?? null,
                  }}
                  className={styles.saveBtn}
                />
              )}

              <div className={styles.footerRight}>
                {isOwner && (
                  <>
                    <Button
                      variant="accent"
                      size="sm"
                      className={`${styles.ownerAction} ${styles.editAction}`}
                      onClick={() => {
                        if (onEdit) onEdit(item);
                        onClose();
                      }}
                    >
                      <Pencil size={14} style={{ marginRight: 6 }} />
                      {t("Edit", { $id: "common.edit" })}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className={`${styles.ownerAction} ${styles.deleteAction}`}
                      onClick={() => {
                        if (onDelete) onDelete(item.id);
                        onClose();
                      }}
                    >
                      <Trash2 size={14} style={{ marginRight: 6 }} />
                      {t("Delete", { $id: "common.delete" })}
                    </Button>
                  </>
                )}

                {!isOwner && (
                  <>
                    <Button
                      variant={isReserved ? "secondary" : "primary"}
                      onClick={handleReserveClick}
                      disabled={!canToggleReservation}
                    >
                      <span style={{ marginRight: 6, display: "inline-flex" }}>
                        <ReservationLockIcon
                          isReserved={isReserved}
                          size={16}
                          animateOnReserve
                        />
                      </span>
                      {isPurchased
                        ? t("Purchased", { $id: "item.status.purchased" })
                        : isReserved
                          ? reservedByMe
                            ? t("Release reservation", {
                                $id: "item.detail.releaseReservation",
                              })
                            : t("Reserved", { $id: "item.status.reserved" })
                          : t("Reserve this gift", {
                              $id: "item.detail.reserveThisGift",
                            })}
                    </Button>

                    {onToggleBought && (
                      <Button
                        variant={isPurchased ? "secondary" : "primary"}
                        size="sm"
                        onClick={handleBoughtClick}
                        disabled={!canToggleBought}
                      >
                        <ShoppingCart size={14} style={{ marginRight: 6 }} />
                        {isPurchased
                          ? t("Purchased", { $id: "item.status.purchased" })
                          : t("Bought", { $id: "item.detail.bought" })}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ActionConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        action={confirmAction ?? "reserve"}
        itemName={item.name}
      />
    </>
  );
}
