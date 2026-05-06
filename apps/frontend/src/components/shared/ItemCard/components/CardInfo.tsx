import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import styles from "../ItemCard.module.scss";
import { cn } from "../utils";

type CardInfoProps = {
  id: string;
  name: string;
  description: string | null;
  formattedPrice: string;
  store: string | null;
  variant: "discover" | "reserved" | "wishlist";
  isOwner: boolean;
  isPurchasedMode: boolean;
  statusLabel: string | null;
  reserveBtnLabel: string;
  isPurchased: boolean;
  isReservedState: boolean;
  canToggleReservation: boolean;
  canToggleBought: boolean;
  handleReserveClick: () => void;
  handleBoughtClick: () => void;
  onToggleBought?: (id: string) => void;
  boughtActionLabel: string;
};

function useOverflowTooltip<T extends HTMLElement>(value: string | null | undefined) {
  const ref = useRef<T | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setIsOverflowing(
        element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth,
      );
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [value]);

  return { ref, isOverflowing };
}

export function CardInfo({
  id,
  name,
  description,
  formattedPrice,
  store,
  variant,
  isOwner,
  isPurchasedMode,
  statusLabel,
  reserveBtnLabel,
  isPurchased,
  isReservedState,
  canToggleReservation,
  canToggleBought,
  handleReserveClick,
  handleBoughtClick,
  onToggleBought,
  boughtActionLabel,
}: CardInfoProps) {
  const isWishlist = variant === "wishlist";
  const useDiscoverReserveStyles = variant === "discover" || (isWishlist && !isOwner);
  const titleTooltip = useOverflowTooltip<HTMLElement>(name);
  const descriptionTooltip = useOverflowTooltip<HTMLParagraphElement>(description);
  void isPurchasedMode;

  return (
    <div className={styles.info}>
      <div className={styles.tooltipTrigger}>
        <div className={styles.titleBlock}>
          <strong ref={titleTooltip.ref}>{name}</strong>
        </div>
        {titleTooltip.isOverflowing ? (
          <div className={styles.textTooltip} role="tooltip">
            <div className={styles.textTooltipArrow} />
            <strong>{name}</strong>
          </div>
        ) : null}
      </div>

      {isWishlist && (
        <div className={styles.tooltipTrigger}>
          <div className={styles.descriptionBlock}>
            <p ref={descriptionTooltip.ref} className={styles.description}>
              {description ?? ""}
            </p>
          </div>
          {description && descriptionTooltip.isOverflowing ? (
            <div className={styles.textTooltip} role="tooltip">
              <div className={styles.textTooltipArrow} />
              <span>{description}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.metaRow}>
        {formattedPrice && <span className={styles.price}>{formattedPrice}</span>}
        {store && (
          <span className={styles.store} title={store}>
            {store}
          </span>
        )}
      </div>

      {!isOwner && (
        <div className={styles.actions}>
          <button
            className={cn(
              styles.reserveBtn,
              useDiscoverReserveStyles && styles.reserveBtnDiscover,
              isReservedState && styles.reserved,
              onToggleBought && styles.reserveCompact,
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleReserveClick();
            }}
            disabled={!canToggleReservation}
          >
            <ReservationLockIcon isReserved={isReservedState} size={16} animateOnReserve />
            <span>{reserveBtnLabel}</span>
          </button>

          {onToggleBought && (
            <button
              className={cn(styles.buyBtn, isPurchased && styles.purchased, "iconTooltipTrigger")}
              onClick={(e) => {
                e.stopPropagation();
                handleBoughtClick();
              }}
              disabled={!canToggleBought}
              aria-label={boughtActionLabel}
              data-tooltip={boughtActionLabel}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
