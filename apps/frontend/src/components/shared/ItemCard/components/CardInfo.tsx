import { ShoppingCart, ThumbsUp } from "lucide-react";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import styles from "../ItemCard.module.scss";

function cn(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}

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
  voteCount: number;
  hasVoted: boolean;
  onToggleVote?: (id: string) => void;
};

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
  voteCount,
  hasVoted,
  onToggleVote,
}: CardInfoProps) {
  const isWishlist = variant === "wishlist";

  return (
    <div className={styles.info}>
      <strong title={name}>{name}</strong>

      {isWishlist && description && <p className={styles.description}>{description}</p>}

      <div className={styles.metaRow}>
        {formattedPrice && <span className={styles.price}>{formattedPrice}</span>}
        {store && (
          <span className={styles.store} title={store}>
            {store}
          </span>
        )}
      </div>

      {isWishlist && !isOwner && onToggleVote && (
        <button
          className={`${styles.voteBtn} ${hasVoted ? styles.voted : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVote(id);
          }}
        >
          <ThumbsUp size={14} />
          {voteCount > 0 && <span className={styles.voteCount}>{voteCount}</span>}
        </button>
      )}

      {!isOwner && (
        <div className={styles.actions}>
          <button
            className={cn(
              styles.reserveBtn,
              isReservedState && styles.reserved,
              onToggleBought && styles.reserveCompact,
              isPurchasedMode && styles.reservePurchased,
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
              className={cn(
                styles.buyBtn,
                isPurchased && styles.purchased,
                isPurchasedMode && styles.buyBtnPurchased,
                "iconTooltipTrigger",
              )}
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

      {variant === "discover" && statusLabel && (
        <div className={styles.statusText}>{statusLabel}</div>
      )}
    </div>
  );
}
