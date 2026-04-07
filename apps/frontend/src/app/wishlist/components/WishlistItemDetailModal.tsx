"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

const priorityLabel: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

type OverflowTooltipProps = {
  className: string;
  tooltipClassName: string;
  tooltipVisibleClassName: string;
  tooltipArrowClassName: string;
  tooltipBody: ReactNode;
  children: ReactNode;
};

function OverflowTooltip({
  className,
  tooltipClassName,
  tooltipVisibleClassName,
  tooltipArrowClassName,
  tooltipBody,
  children,
}: OverflowTooltipProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxWidth: 320 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const element = triggerRef.current;
    if (!element) return;

    const getMeasuredElement = () =>
      (element.firstElementChild as HTMLElement | null) ?? element;

    const measureOverflow = () => {
      const measuredElement = getMeasuredElement();
      const nextOverflow =
        measuredElement.scrollHeight > measuredElement.clientHeight + 1 ||
        measuredElement.scrollWidth > measuredElement.clientWidth + 1;

      setIsOverflowing(nextOverflow);
      if (!nextOverflow) setIsVisible(false);
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(getMeasuredElement());

    window.addEventListener("resize", measureOverflow);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [children]);

  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const element = triggerRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const maxWidth = Math.min(360, Math.max(220, window.innerWidth - 32));
      const left = Math.min(rect.left + 20, window.innerWidth - maxWidth - 16);

      setPosition({
        top: Math.max(16, rect.top - 14),
        left: Math.max(16, left),
        maxWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        onMouseEnter={() => {
          if (isOverflowing) setIsVisible(true);
        }}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isMounted &&
        isVisible &&
        isOverflowing &&
        createPortal(
          <div
            className={`${tooltipClassName} ${tooltipVisibleClassName}`}
            style={{
              top: position.top,
              left: position.left,
              maxWidth: position.maxWidth,
              transform: "translateY(-100%)",
            }}
            role="tooltip"
          >
            <div className={tooltipArrowClassName} />
            {tooltipBody}
          </div>,
          document.body,
        )}
    </>
  );
}

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
            <OverflowTooltip
              className={styles.titleBlock}
              tooltipClassName={styles.textTooltip}
              tooltipVisibleClassName={styles.textTooltipVisible}
              tooltipArrowClassName={styles.textTooltipArrow}
              tooltipBody={<strong>{item.name}</strong>}
            >
              <h2>{item.name}</h2>
            </OverflowTooltip>

            {item.description && (
              <OverflowTooltip
                className={styles.descriptionBlock}
                tooltipClassName={styles.textTooltip}
                tooltipVisibleClassName={styles.textTooltipVisible}
                tooltipArrowClassName={styles.textTooltipArrow}
                tooltipBody={<span>{item.description}</span>}
              >
                <p className={styles.description}>{item.description}</p>
              </OverflowTooltip>
            )}

            <div className={styles.meta}>
              {item.price && (
                <span className={styles.price}>
                  {formatPrice(item.price, item.currency)}
                </span>
              )}
              {item.priority != null && priorityLabel[item.priority] && (
                <span className={styles.priority}>
                  {priorityLabel[item.priority]}
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
                  <span>Visit website</span>
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
                      Edit
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
                      Delete
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
                        onClick={handleBoughtClick}
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
