"use client";

import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DiscoverItem } from "@/api/types/wishilst";
import { Heart, ExternalLink, ShoppingCart } from "lucide-react";
import styles from "./ItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";

type Props = {
  open: boolean;
  onClose: () => void;
  item: DiscoverItem;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
};

export function ItemDetailModal({
  open,
  onClose,
  item,
  onToggleReserve,
  onToggleBought,
}: Props) {
  const { data: currentUserId = "" } = useCurrentUserId();
  const reservedByValue = (item.reservedBy ?? item.reserved_by ?? null)?.toString() ?? null;
  const isPurchased = item.status === 2;
  const isReserved = item.isReserved || item.status === 1 || (!!reservedByValue && !isPurchased);
  const reservedByMe = !!reservedByValue && reservedByValue === currentUserId;
  const canToggleReservation = !isPurchased && (!isReserved || reservedByMe);
  const canToggleBought =
    (isPurchased && reservedByMe) ||
    (!isPurchased && (!isReserved || reservedByMe));
  const imgSrc = item.image_url || item.image;

  const reserveStatusLabel = isPurchased
    ? reservedByMe
      ? "Purchased by you"
      : item.reservedByName
        ? `Purchased by ${item.reservedByName}`
        : "Purchased"
    : isReserved
      ? reservedByMe
        ? "Reserved by you"
        : item.reservedByName
          ? `Reserved by ${item.reservedByName}`
          : "Reserved"
      : null;

  return (
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
                {typeof item.price === "number"
                  ? `$${item.price.toFixed(2)}`
                  : item.price}
              </span>
            )}
            {item.store && <span className={styles.store}>{item.store}</span>}
            {item.priority && (
              <span className={styles.priority}>{item.priority}</span>
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
                <span>Visit website</span>
              </a>
            )}

            <div className={styles.actions}>
              <Button
                variant={isReserved ? "secondary" : "primary"}
                onClick={() => {
                  if (canToggleReservation && onToggleReserve)
                    onToggleReserve(item.id);
                }}
                disabled={!canToggleReservation}
              >
                <Heart
                  size={16}
                  fill={isReserved ? "currentColor" : "none"}
                  style={{ marginRight: 6 }}
                />
                {isPurchased
                  ? "Purchased"
                  : isReserved
                    ? reservedByMe
                      ? "Release reservation"
                      : "Reserved"
                    : "Reserve this gift"}
              </Button>

              {onToggleBought && (
                <Button
                  variant={isPurchased ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => {
                    if (canToggleBought) onToggleBought(item.id);
                  }}
                  disabled={!canToggleBought}
                >
                  <ShoppingCart size={14} style={{ marginRight: 6 }} />
                  {isPurchased ? "Purchased" : "Bought"}
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
  );
}
