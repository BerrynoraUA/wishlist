"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DiscoverItemCard.module.scss";
import { DiscoverItem } from "@/api/types/wishilst";
import { Heart, ExternalLink, MoreHorizontal, ShoppingCart } from "lucide-react";
import { ItemDetailModal } from "./ItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";

type Props = DiscoverItem & {
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  showDiscountBadge?: boolean;
};

export function DiscoverItemCard({
  id,
  title,
  price,
  store,
  image,
  isReserved,
  status,
  image_url,
  url,
  description,
  priority,
  reservedBy,
  reserved_by,
  reservedByName,
  share_url,
  discount_price,
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { data: currentUserId = "" } = useCurrentUserId();
  const reservedByValue = (reservedBy ?? reserved_by ?? null)?.toString() ?? null;
  const isPurchased = status === 2;
  const isReservedState = isReserved || status === 1 || (!!reservedByValue && !isPurchased);
  const reservedByMe = !!reservedByValue && reservedByValue === currentUserId;
  const canToggleReservation = !isPurchased && (reservedByMe || !isReservedState);
  const canToggleBought =
    (isPurchased && reservedByMe) ||
    (!isPurchased && (!isReservedState || reservedByMe));
  const imgSrc = image_url || image;
  const shareLink = share_url || url || "";
  const hasShareLink = Boolean(shareLink);
  const hasProductLink = Boolean(url);
  const formattedPrice =
    typeof price === "number"
      ? `$${price.toFixed(2)}`
      : price?.toString().startsWith("$")
        ? price.toString()
        : price
          ? `$${price}`
          : "";

  function parsePriceToNumber(
    value: string | number | null | undefined,
  ): number | null {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const safe = trimmed.replace(/[^0-9,.-]/g, "");
    if (!safe) return null;

    const hasComma = safe.includes(",");
    const hasDot = safe.includes(".");
    const normalized =
      hasComma && hasDot ? safe.replace(/,/g, "") : safe.replace(/,/g, ".");

    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  const salePercentOff = (() => {
    if (!showDiscountBadge) return null;
    if (discount_price == null) return null;

    const base = parsePriceToNumber(price);
    const discounted = parsePriceToNumber(discount_price);
    if (!base || !discounted) return null;
    if (base <= 0 || discounted >= base) return null;

    const raw = ((base - discounted) / base) * 100;
    const rounded = Math.round(raw);
    if (!Number.isFinite(rounded) || rounded <= 0) return null;
    return Math.min(99, rounded);
  })();

  const reserveStatusLabel = isPurchased
    ? reservedByMe
      ? "Purchased by you"
      : reservedByName
        ? `Purchased by ${reservedByName}`
        : "Purchased"
    : isReservedState
      ? reservedByMe
        ? "Reserved by you"
        : reservedByName
          ? `Reserved by ${reservedByName}`
          : "Reserved"
      : null;

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      }

      if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const handleShare = async () => {
      if (!shareLink) return;

      try {
        if (navigator.share) {
          await navigator.share({ url: shareLink });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareLink);
        } else {
          window.open(shareLink, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        console.error("Failed to share item", error);
      } finally {
        setMenuOpen(false);
      }
    };

  return (
    <>
      <div className={styles.card} onClick={() => setDetailOpen(true)}>
        {salePercentOff != null && (
          <span className={styles.saleBadge}>Sale -{salePercentOff}%</span>
        )}
        {priority && <span className={styles.priority}>{priority}</span>}

        <div className={styles.imageWrapper}>
          {imgSrc ? (
            <img src={imgSrc} alt={title} />
          ) : (
            <div className={styles.placeholder}>No image</div>
          )}

            <div className={styles.quickActions}>
              <a
                href={hasProductLink ? url : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.iconButton} ${!hasProductLink ? styles.disabled : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasProductLink) e.preventDefault();
                }}
                aria-label="Open product link"
                aria-disabled={!hasProductLink}
              >
                <ExternalLink size={16} />
              </a>

              <div className={styles.menuWrapper} ref={menuRef}>
                <button
                  className={`${styles.iconButton} ${!hasShareLink ? styles.disabled : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasShareLink) return;
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label="Open item menu"
                  aria-disabled={!hasShareLink}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                  <div className={styles.dropdown}>
                    <button
                      className={`${styles.dropdownItem} ${hasShareLink ? styles.shareItem : styles.disabled}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasShareLink) return;
                        handleShare();
                      }}
                      aria-disabled={!hasShareLink}
                    >
                      <span>Share</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className={styles.info}>
          <strong>{title}</strong>

          <div className={styles.metaRow}>
            {formattedPrice && <span className={styles.price}>{formattedPrice}</span>}
            {store && <span className={styles.store}>{store}</span>}
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.reserveBtn} ${isReservedState ? styles.reserved : ""} ${onToggleBought ? styles.reserveCompact : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canToggleReservation && onToggleReserve)
                  onToggleReserve(id);
              }}
              disabled={!canToggleReservation}
            >
              <Heart size={16} fill={isReservedState ? "currentColor" : "none"} />
              <span>
                {isPurchased
                  ? "Purchased"
                  : isReservedState
                    ? reservedByMe
                      ? "Reserved by you"
                      : "Reserved"
                    : "Reserve this gift"}
              </span>
            </button>

            {onToggleBought && (
              <button
                className={`${styles.buyBtn} ${isPurchased ? styles.purchased : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canToggleBought) onToggleBought(id);
                }}
                disabled={!canToggleBought}
                aria-label={isPurchased ? "Mark as not purchased" : "Mark as purchased"}
                title={reserveStatusLabel ?? "Mark as purchased"}
              >
                <ShoppingCart size={16} />
              </button>
            )}
          </div>

          {reserveStatusLabel && (
            <div className={styles.statusText}>{reserveStatusLabel}</div>
          )}
        </div>
      </div>

      <ItemDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={{
          id,
          title,
          price,
          store,
          image: imgSrc,
          isReserved: isReservedState,
          status,
          image_url,
          url,
          share_url,
          description,
          priority,
          reservedBy: reservedByValue,
          reservedByName,
        }}
        onToggleReserve={onToggleReserve}
        onToggleBought={onToggleBought}
      />
    </>
  );
}
