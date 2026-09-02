"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DiscoverItem } from "@/api/types/wishilst";
import { ExternalLink, Link2, MoreHorizontal, ShoppingCart, X } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useReportItem } from "@/hooks/use-items";
import { shareItemLink } from "@/lib/helpers/item-card";
import styles from "./ItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";
import {
  buildReservationActionLabel,
  buildSaveItemData,
  getItemReservationState,
  getItemStoreFromUrl,
  getNextConfirmAction,
  getReservedByValue,
} from "@/lib/helpers/item-card";

type ReserveActionType = "reserve" | "unreserve";
type BoughtActionType = "purchase" | "unpurchase";

type ItemActionHandlerContext = {
  item: DiscoverItem;
  itemId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: DiscoverItem;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  onReserveAction?: (action: ReserveActionType, context: ItemActionHandlerContext) => void;
  onBoughtAction?: (action: BoughtActionType, context: ItemActionHandlerContext) => void;
};

export function ItemDetailModal({
  open,
  onClose,
  item,
  onToggleReserve,
  onToggleBought,
  onReserveAction,
  onBoughtAction,
}: Props) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { formatPrice } = useCurrencyFormatter();
  const shareLink = item.share_url || item.url || null;
  const reportItem = useReportItem();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ItemActionConfirmType | null>(null);
  const reservedByValue = getReservedByValue(item.reservedBy ?? item.reserved_by ?? null);
  const reservationState = getItemReservationState({
    status: item.status,
    isReserved: item.isReserved,
    reservedBy: reservedByValue,
    currentUserId,
  });
  const imgSrc = item.image_url || item.image;
  const canShowBoughtAction = Boolean(onToggleBought || onBoughtAction);

  // The diagonal stamp on the image carries the status.
  const showStatusStamp = reservationState.isPurchased || reservationState.isReserved;

  const handleReserveClick = () => {
    if (!reservationState.canToggleReservation || (!onToggleReserve && !onReserveAction)) return;
    setConfirmAction(getNextConfirmAction("reserve", reservationState.isReserved));
  };

  const handleBoughtClick = () => {
    if (!reservationState.canToggleBought || !canShowBoughtAction) return;
    setConfirmAction(getNextConfirmAction("purchase", reservationState.isPurchased));
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const context = {
      item,
      itemId: item.id,
    };

    if (confirmAction === "reserve" || confirmAction === "unreserve") {
      if (onReserveAction) {
        onReserveAction(confirmAction, context);
      } else {
        onToggleReserve?.(item.id);
      }
    } else {
      if (onBoughtAction) {
        onBoughtAction(confirmAction, context);
      } else {
        onToggleBought?.(item.id);
      }
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

          {imgSrc && (
            <div className={styles.imageSection}>
              <img src={imgSrc} alt={item.title} />

              <div className={styles.imageSaveAction}>
                <SaveToWishlistButton
                  item={buildSaveItemData({
                    name: item.title,
                    description: item.description,
                    price: item.price,
                    imageUrl: imgSrc,
                    url: item.url,
                    priority_id: item.priority_id,
                    discountPrice: item.discount_price,
                    hasDiscount: item.discount_price != null,
                    currency: item.currency,
                    additionalLinks: item.additional_links,
                  })}
                  className={styles.imageCornerButton}
                  tooltipAlign="start"
                />
              </div>

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
                  {canShowBoughtAction && (
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
                  {shareLink && (
                    <DropdownMenuItem variant="share" onClick={() => shareItemLink(shareLink)}>
                      <span>{t("Share", { $id: "itemCard.share" })}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="danger" onClick={() => setReportOpen(true)}>
                    <span>{t("Report", { $id: "itemCard.report" })}</span>
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>

              {showStatusStamp && (
                <div
                  className={`${styles.reservedStamp} ${
                    reservationState.isPurchased ? styles.purchasedStamp : ""
                  }`}
                  aria-hidden="true"
                >
                  <span>
                    {reservationState.isPurchased
                      ? t("Purchased", { $id: "discover.detail.purchasedStamp" })
                      : t("Reserved", { $id: "discover.detail.reservedStamp" })}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={styles.details}>
            <div className={styles.tooltipTrigger}>
              <div className={styles.titleBlock}>
                <h2>{item.title}</h2>
              </div>
              <div className={styles.textTooltip} role="tooltip">
                <div className={styles.textTooltipArrow} />
                <strong>{item.title}</strong>
              </div>
            </div>

            {item.description && (
              <div className={styles.tooltipTrigger}>
                <div className={styles.descriptionBlock}>
                  <p className={styles.description}>{item.description}</p>
                </div>
                <div className={styles.textTooltip} role="tooltip">
                  <div className={styles.textTooltipArrow} />
                  <span>{item.description}</span>
                </div>
              </div>
            )}

            <div className={styles.meta}>
              {item.price != null && (
                <span className={styles.price}>{formatPrice(item.price, item.currency)}</span>
              )}
            </div>

            <div className={styles.footer}>
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
        itemName={item.title}
      />
    </>
  );
}
