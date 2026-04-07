"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DiscoverItem } from "@/api/types/wishilst";
import { ExternalLink, ShoppingCart } from "lucide-react";
import styles from "./ItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";

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
  onReserveAction?: (
    action: ReserveActionType,
    context: ItemActionHandlerContext,
  ) => void;
  onBoughtAction?: (
    action: BoughtActionType,
    context: ItemActionHandlerContext,
  ) => void;
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
  const [confirmAction, setConfirmAction] =
    useState<ItemActionConfirmType | null>(null);
  const reservedByValue =
    (item.reservedBy ?? item.reserved_by ?? null)?.toString() ?? null;
  const isPurchased = item.status === 2;
  const isReserved =
    item.isReserved || item.status === 1 || (!!reservedByValue && !isPurchased);
  const reservedByMe = !!reservedByValue && reservedByValue === currentUserId;
  const canToggleReservation = !isPurchased && (!isReserved || reservedByMe);
  const canToggleBought =
    (isPurchased && reservedByMe) ||
    (!isPurchased && (!isReserved || reservedByMe));
  const imgSrc = item.image_url || item.image;

  const reserveStatusLabel = isPurchased
    ? reservedByMe
      ? t("Purchased by you", {
          $id: "discover.detail.purchasedByYouStatus",
        })
      : item.reservedByName
        ? t("Purchased by {name}", {
            name: item.reservedByName,
            $id: "discover.detail.purchasedByNameStatus",
          })
        : t("Purchased", { $id: "discover.detail.purchasedStatus" })
    : isReserved
      ? reservedByMe
        ? t("Reserved by you", {
            $id: "discover.detail.reservedByYouStatus",
          })
        : item.reservedByName
          ? t("Reserved by {name}", {
              name: item.reservedByName,
              $id: "discover.detail.reservedByNameStatus",
            })
          : t("Reserved", { $id: "discover.detail.reservedStatus" })
      : null;

  const handleReserveClick = () => {
    if (!canToggleReservation || (!onToggleReserve && !onReserveAction)) return;
    setConfirmAction(isReserved ? "unreserve" : "reserve");
  };

  const handleBoughtClick = () => {
    if (!canToggleBought || (!onToggleBought && !onBoughtAction)) return;
    setConfirmAction(isPurchased ? "unpurchase" : "purchase");
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
          {imgSrc && (
            <div className={styles.imageSection}>
              <img src={imgSrc} alt={item.title} />
            </div>
          )}

          <div className={styles.details}>
            <h2>{item.title}</h2>

            {item.description && (
              <p className={styles.description}>{item.description}</p>
            )}

            <div className={styles.meta}>
              {item.price != null && (
                <span className={styles.price}>
                  {formatPrice(item.price, item.currency)}
                </span>
              )}
              {item.store && <span className={styles.store}>{item.store}</span>}
              {item.priority != null && (
                <span className={styles.priority}>
                  {item.priority === "Low" || item.priority === 1
                    ? t("Low", { $id: "discover.detail.priorityLow" })
                    : item.priority === "Medium" || item.priority === 2
                      ? t("Medium", {
                          $id: "discover.detail.priorityMedium",
                        })
                      : item.priority === "High" || item.priority === 3
                        ? t("High", {
                            $id: "discover.detail.priorityHigh",
                          })
                        : item.priority}
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
                    {t("Visit website", {
                      $id: "discover.detail.visitWebsite",
                    })}
                  </span>
                </a>
              )}

              <SaveToWishlistButton
                item={{
                  name: item.title,
                  description: item.description ?? null,
                  price: item.price != null ? String(item.price) : null,
                  image_url: imgSrc || null,
                  url: item.url ?? null,
                  priority:
                    typeof item.priority === "number"
                      ? item.priority
                      : item.priority === "High"
                        ? 3
                        : item.priority === "Medium"
                          ? 2
                          : item.priority === "Low"
                            ? 1
                            : null,
                  discount_price:
                    item.discount_price != null
                      ? String(item.discount_price)
                      : null,
                  has_discount: item.discount_price != null,
                  currency: item.currency ?? null,
                }}
                className={styles.saveBtn}
              />

              <div className={styles.actions}>
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
                    ? t("Purchased", { $id: "discover.detail.purchasedBtn" })
                    : isReserved
                      ? reservedByMe
                        ? t("Release reservation", {
                            $id: "discover.detail.releaseReservation",
                          })
                        : t("Reserved", { $id: "discover.detail.reservedBtn" })
                      : t("Reserve this gift", {
                          $id: "discover.detail.reserveGift",
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
                      ? t("Purchased", {
                          $id: "discover.detail.purchasedCartBtn",
                        })
                      : t("Bought", { $id: "discover.detail.bought" })}
                  </Button>
                )}
              </div>

              {reserveStatusLabel && (
                <span className={styles.statusText}>{reserveStatusLabel}</span>
              )}
            </div>
          </div>
        </div>
      </Modal>

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
