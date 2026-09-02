"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { Item } from "@/types/item";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  MoreHorizontal,
  Pencil,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useReportItem } from "@/hooks/use-items";
import styles from "./WishlistItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";
import {
  buildPurchaseActionLabel,
  buildReservationActionLabel,
  buildSaveItemData,
  getItemReservationState,
  getItemStoreFromUrl,
  getNextConfirmAction,
} from "@/lib/helpers/item-card";

type Props = {
  open: boolean;
  onClose: () => void;
  item: Item;
  isOwner?: boolean;
  showOwnerReservation?: boolean;
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
  showOwnerReservation = false,
  onToggleReserve,
  onToggleBought,
  reservedByName,
  onDelete,
  onEdit,
}: Props) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const hasEditDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "edit-item",
    scopeId: item.id,
  });
  const { formatPrice } = useCurrencyFormatter();
  const [confirmAction, setConfirmAction] = useState<ItemActionConfirmType | null>(null);
  const [reserverRevealed, setReserverRevealed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const reportItem = useReportItem();
  const reservationState = getItemReservationState({
    status: item.status,
    reservedBy: item.reserved_by,
    currentUserId,
  });

  // The diagonal stamp on the image carries the status, so only the flag matters.
  const hasReservationStatus = reservationState.isPurchased || reservationState.isReserved;
  // An owner always sees a reservation they made themselves — the spoiler only hides
  // what someone else did.
  const showStatusStamp =
    hasReservationStatus && (!isOwner || showOwnerReservation || reservationState.reservedByMe);
  const canRevealReserver = showOwnerReservation && showStatusStamp && Boolean(reservedByName);

  const handleReserveClick = () => {
    if (!reservationState.canToggleReservation || !onToggleReserve) return;
    setConfirmAction(getNextConfirmAction("reserve", reservationState.isReserved));
  };

  const handleBoughtClick = () => {
    if (!reservationState.canToggleBought || !onToggleBought) return;
    setConfirmAction(getNextConfirmAction("purchase", reservationState.isPurchased));
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
          <div className={styles.closeRow}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={t("Close", { $id: "common.close" })}
            >
              <X size={16} />
            </button>
          </div>

          {item.image_url && (
            <div className={styles.imageSection}>
              <img src={item.image_url} alt={item.name} />

              {showStatusStamp && (
                <div
                  className={`${styles.reservedStamp} ${
                    reservationState.isPurchased ? styles.purchasedStamp : ""
                  }`}
                  aria-hidden="true"
                >
                  <span className={reserverRevealed ? styles.reservedStampName : undefined}>
                    {reserverRevealed && reservedByName
                      ? reservedByName
                      : reservationState.isPurchased
                        ? t("Purchased", { $id: "item.status.purchasedStamp" })
                        : t("Reserved", { $id: "item.status.reservedStamp" })}
                  </span>
                </div>
              )}

              {!isOwner && (
                <div className={styles.imageSaveAction}>
                  <SaveToWishlistButton
                    item={buildSaveItemData({
                      name: item.name,
                      description: item.description,
                      price: item.price,
                      imageUrl: item.image_url,
                      url: item.url,
                      priority_id: item.priority_id,
                      discountPrice: item.discount_price,
                      hasDiscount: item.has_discount,
                      discountEndDate: item.discount_end_date,
                      currency: item.currency,
                      additionalLinks: item.additional_links,
                    })}
                    className={styles.imageCornerButton}
                    tooltipAlign="start"
                  />
                </div>
              )}

              {!isOwner && (
                <div className={styles.imageMenu}>
                  <DropdownMenu
                    trigger={({ toggle }) => (
                      <button
                        type="button"
                        className={styles.imageCornerButton}
                        onClick={toggle}
                        aria-label={t("More options", { $id: "itemCard.moreOptions" })}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  >
                    {onToggleBought && (
                      <DropdownMenuItem
                        icon={<ShoppingCart size={16} />}
                        disabled={!reservationState.canToggleBought}
                        onClick={handleBoughtClick}
                      >
                        <span>
                          {reservationState.isPurchased
                            ? t("Mark as not purchased", { $id: "itemCard.unpurchase" })
                            : t("Mark as purchased", { $id: "itemCard.purchase" })}
                        </span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem variant="danger" onClick={() => setReportOpen(true)}>
                      <span>{t("Report", { $id: "itemCard.report" })}</span>
                    </DropdownMenuItem>
                  </DropdownMenu>
                </div>
              )}

              {isOwner && (
                <div className={styles.imageMenu}>
                  <DropdownMenu
                    trigger={({ toggle }) => (
                      <button
                        type="button"
                        className={styles.imageMenuTrigger}
                        onClick={toggle}
                        aria-label={t("More options", { $id: "itemCard.moreOptions" })}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  >
                    <DropdownMenuItem
                      disabled={!reservationState.canToggleReservation}
                      onClick={handleReserveClick}
                    >
                      <span>
                        {buildReservationActionLabel(reservationState, {
                          purchased: () => t("Purchased", { $id: "item.status.purchased" }),
                          reservedByYou: () =>
                            t("Release reservation", { $id: "item.detail.releaseReservation" }),
                          reserved: () => t("Reserved", { $id: "item.status.reserved" }),
                          available: () =>
                            t("Reserve this gift", { $id: "item.detail.reserveThisGift" }),
                        })}
                      </span>
                    </DropdownMenuItem>
                    {onToggleBought && (
                      <DropdownMenuItem
                        disabled={!reservationState.canToggleBought}
                        onClick={handleBoughtClick}
                      >
                        <span>
                          {buildPurchaseActionLabel(reservationState.isPurchased, {
                            purchased: () => t("Purchased", { $id: "item.status.purchased" }),
                            available: () => t("Bought", { $id: "item.detail.bought" }),
                          })}
                        </span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                </div>
              )}

              {canRevealReserver && (
                <button
                  type="button"
                  className={styles.revealReserverButton}
                  onClick={() => setReserverRevealed((value) => !value)}
                  aria-pressed={reserverRevealed}
                  aria-label={
                    reserverRevealed
                      ? t("Hide who reserved this", { $id: "item.status.hideReserver" })
                      : t("Show who reserved this", { $id: "item.status.showReserver" })
                  }
                >
                  {reserverRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
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

            {item.description && <p className={styles.descriptionFull}>{item.description}</p>}

            <div className={styles.meta}>
              {item.price && (
                <span className={styles.price}>{formatPrice(item.price, item.currency)}</span>
              )}
            </div>

            <div className={styles.footer}>
              {/* All links section */}
              {(item.url || (item.additional_links && item.additional_links.length > 0)) && (
                <div className={styles.linksSection}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkBtn}
                    >
                      <ExternalLink size={14} />
                      <span>{t("Go to store", { $id: "itemCard.goToStore" })}</span>
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
                      {hasEditDraft && (
                        <DraftBadge variant="dot" className={styles.ownerActionDraftDot} />
                      )}
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
                      variant={reservationState.isReserved ? "secondary" : "primary"}
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
                        purchased: () => t("Purchased", { $id: "item.status.purchased" }),
                        reservedByYou: () =>
                          t("Release reservation", {
                            $id: "item.detail.releaseReservation",
                          }),
                        reserved: () => t("Reserved", { $id: "item.status.reserved" }),
                        available: () =>
                          t("Reserve this gift", {
                            $id: "item.detail.reserveThisGift",
                          }),
                      })}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onConfirm={() => reportItem.mutate(item.id, { onSuccess: () => setReportOpen(false) })}
        title={t("Report this item", { $id: "itemCard.reportTitle" })}
        description={t(
          "Tell us this item breaks the rules and our team will take a look. You can only report an item once.",
          { $id: "itemCard.reportDescription" },
        )}
        confirmLabel={t("Report", { $id: "itemCard.reportConfirm" })}
        isPending={reportItem.isPending}
      />

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
