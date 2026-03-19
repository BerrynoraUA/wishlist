"use client";

import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Item } from "@/types/item";
import { Heart, ExternalLink, Trash2, Pencil, ShoppingCart } from "lucide-react";
import styles from "./WishlistItemDetailModal.module.scss";
import { useCurrentUserId } from "@/hooks/use-user";

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

const priorityLabel: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
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
  const { data: currentUserId = "" } = useCurrentUserId();
  const isPurchased = item.status === 2;
  const isReserved = item.status === 1 || (!isPurchased && !!item.reserved_by);
  const reservedByMe = currentUserId
    ? item.reserved_by === currentUserId
    : false;
  const canToggleReservation = !isOwner && !isPurchased && (!isReserved || reservedByMe);
  const canToggleBought =
    !isOwner &&
    ((isPurchased && reservedByMe) ||
      (!isPurchased && (!isReserved || reservedByMe)));

  const reserveStatusLabel = isPurchased
    ? reservedByMe
      ? "Purchased by you"
      : reservedByName
        ? `Purchased by ${reservedByName}`
        : "Purchased"
    : isReserved
      ? reservedByMe
        ? "Reserved by you"
        : reservedByName
          ? `Reserved by ${reservedByName}`
          : "Reserved"
      : null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        {item.image_url && (
          <div className={styles.imageSection}>
            <img src={item.image_url} alt={item.name} />
          </div>
        )}

        <div className={styles.details}>
          <h2>{item.name}</h2>

          {item.description && (
            <p className={styles.description}>{item.description}</p>
          )}

          <div className={styles.meta}>
            {item.price && (
              <span className={styles.price}>{item.price}</span>
            )}
            {item.priority != null && priorityLabel[item.priority] && (
              <span className={styles.priority}>
                {priorityLabel[item.priority]}
              </span>
            )}
            {reserveStatusLabel && (
              <span className={styles.reservedBadge}>{reserveStatusLabel}</span>
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

            <div className={styles.footerRight}>
              {isOwner && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (onEdit) onEdit(item);
                      onClose();
                    }}
                  >
                    <Pencil size={14} style={{ marginRight: 6 }} />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (onDelete) onDelete(item.id);
                      onClose();
                    }}
                  >
                    <Trash2 size={14} style={{ marginRight: 6 }} />
                    Delete
                  </Button>
                </>
              )}

              {!isOwner && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
