"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Item } from "@/types/item";
import {
  ExternalLink,
  Trash2,
  Pencil,
  ShoppingCart,
  Link2,
} from "lucide-react";
import styles from "./WishlistItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";
import {
  buildItemPriorityLabel,
  buildPurchaseActionLabel,
  buildReservationActionLabel,
  buildReservationStatusLabel,
  buildSaveItemData,
  getItemPriorityKey,
  getItemReservationState,
  getItemStoreFromUrl,
  getNextConfirmAction,
} from "@/lib/helpers/item-card";

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
  const reservationState = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
    isOwner,
  });
  const priorityKey = getItemPriorityKey(item.priority);
  const priorityLabels = useMemo(
    () => ({
      low: t("Low", { $id: "item.priority.low" }),
      medium: t("Medium", { $id: "item.priority.medium" }),
      high: t("High", { $id: "item.priority.high" }),
    }),
    [t],
  );
  const priorityLabel = buildItemPriorityLabel(item.priority, priorityLabels);

  const reserveStatusLabel = buildReservationStatusLabel(
    reservationState,
    reservedByName,
    {
      purchasedByYou: () =>
        t("Purchased by you", { $id: "item.status.purchasedByYou" }),
      purchased: () => t("Purchased", { $id: "item.status.purchased" }),
      purchasedByName: (name) =>
        t("Purchased by {name}", {
          name,
          $id: "item.status.purchasedByName",
        }),
      reservedByYou: () =>
        t("Reserved by you", { $id: "item.status.reservedByYou" }),
      reserved: () => t("Reserved", { $id: "item.status.reserved" }),
      reservedByName: (name) =>
        t("Reserved by {name}", {
          name,
          $id: "item.status.reservedByName",
        }),
    },
  );

  const handleReserveClick = () => {
    if (!reservationState.canToggleReservation || !onToggleReserve) return;
    setConfirmAction(
      getNextConfirmAction("reserve", reservationState.isReserved),
    );
  };

  const handleBoughtClick = () => {
    if (!reservationState.canToggleBought || !onToggleBought) return;
    setConfirmAction(
      getNextConfirmAction("purchase", reservationState.isPurchased),
    );
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
              {priorityKey && priorityLabel && (
                <span className={styles.priority}>{priorityLabel}</span>
              )}
              {reserveStatusLabel && (
                <span className={styles.reservedBadge}>
                  {reserveStatusLabel}
                </span>
              )}
            </div>

            <div className={styles.footer}>
              {/* All links section */}
              {(item.url ||
                (item.additional_links &&
                  item.additional_links.length > 0)) && (
                <div className={styles.linksSection}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkBtn}
                    >
                      <ExternalLink size={14} />
                      <span>
                        {getItemStoreFromUrl(item.url) ||
                          t("Visit website", {
                            $id: "item.detail.visitWebsite",
                          })}
                      </span>
                    </a>
                  )}
                  {item.additional_links?.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkBtnSecondary}
                    >
                      <Link2 size={14} />
                      <span>
                        {link.title ||
                          getItemStoreFromUrl(link.url) ||
                          t("Link", { $id: "item.detail.link" })}
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {!isOwner && (
                <SaveToWishlistButton
                  item={buildSaveItemData({
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    imageUrl: item.image_url,
                    url: item.url,
                    priority: item.priority,
                    discountPrice: item.discount_price,
                    hasDiscount: item.has_discount,
                    discountEndDate: item.discount_end_date,
                    currency: item.currency,
                    additionalLinks: item.additional_links,
                  })}
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
                      variant={
                        reservationState.isReserved ? "secondary" : "primary"
                      }
                      onClick={handleReserveClick}
                      disabled={!reservationState.canToggleReservation}
                    >
                      <span style={{ marginRight: 6, display: "inline-flex" }}>
                        <ReservationLockIcon
                          isReserved={reservationState.isReserved}
                          size={16}
                          animateOnReserve
                        />
                      </span>
                      {buildReservationActionLabel(reservationState, {
                        purchased: () =>
                          t("Purchased", { $id: "item.status.purchased" }),
                        reservedByYou: () =>
                          t("Release reservation", {
                            $id: "item.detail.releaseReservation",
                          }),
                        reserved: () =>
                          t("Reserved", { $id: "item.status.reserved" }),
                        available: () =>
                          t("Reserve this gift", {
                            $id: "item.detail.reserveThisGift",
                          }),
                      })}
                    </Button>

                    {onToggleBought && (
                      <Button
                        variant={
                          reservationState.isPurchased ? "secondary" : "primary"
                        }
                        size="sm"
                        onClick={handleBoughtClick}
                        disabled={!reservationState.canToggleBought}
                      >
                        <ShoppingCart size={14} style={{ marginRight: 6 }} />
                        {buildPurchaseActionLabel(
                          reservationState.isPurchased,
                          {
                            purchased: () =>
                              t("Purchased", { $id: "item.status.purchased" }),
                            available: () =>
                              t("Bought", { $id: "item.detail.bought" }),
                          },
                        )}
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
