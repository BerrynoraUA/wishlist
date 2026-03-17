"use client";

import styles from "./WishlistItemCard.module.scss";
import { useEffect, useRef, useState } from "react";
import { Item } from "@/types/item";
import {
  Heart,
  ExternalLink,
  ShoppingBag,
  ShoppingCart,
  MoreHorizontal,
} from "lucide-react";
import { WishlistItemDetailModal } from "./WishlistItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";

type Props = {
  item: Item;
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  reservedByName?: string | null;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
};

export function WishlistItemCard({
  item,
  isOwner = false,
  showDiscountBadge = false,
  onToggleReserve,
  onToggleBought,
  reservedByName,
  onDelete,
  onEdit,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
  const hasImage = Boolean(item.image_url);
  const price = item.price || "";
  const title = item.name;
  const priorityLabel: Record<number, "Low" | "Medium" | "High"> = {
    1: "Low",
    2: "Medium",
    3: "High",
  };

  const priority = item.priority ? priorityLabel[item.priority] : null;
  const store = (() => {
    if (!item.url) return "";
    try {
      return new URL(item.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  const formattedPrice = (() => {
    if (!price) return "";
    return price.startsWith("$") ? price : `$${price}`;
  })();

  function parsePriceToNumber(value: string | null | undefined): number | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const safe = trimmed.replace(/[^0-9,.-]/g, "");
    if (!safe) return null;

    const hasComma = safe.includes(",");
    const hasDot = safe.includes(".");

    // If both exist, treat comma as thousands separator.
    const normalized = hasComma && hasDot ? safe.replace(/,/g, "") : safe.replace(/,/g, ".");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  const salePercentOff = (() => {
    if (!showDiscountBadge) return null;
    if (!item.has_discount) return null;

    const base = parsePriceToNumber(item.price);
    const discounted = parsePriceToNumber(item.discount_price);
    if (!base || !discounted) return null;
    if (base <= 0) return null;

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
    : isReserved
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

  return (
    <>
      <div className={styles.card} onClick={() => setDetailOpen(true)}>
        <div className={styles.media}>
          <div className={styles.imageFrame}>
            {hasImage ? (
              <img src={item.image_url as string} alt={title} />
            ) : (
              <div className={styles.placeholder}>
                <ShoppingBag size={32} />
              </div>
            )}
          </div>

          {reserveStatusLabel && !isOwner && (
            <div
              className={`${styles.badgeLeft} ${isPurchased ? styles.purchasedBadge : ""}`}
            >
              {isPurchased ? (
                <ShoppingCart size={14} />
              ) : (
                <Heart size={14} fill="currentColor" />
              )}
              <span>{reserveStatusLabel}</span>
            </div>
          )}

          <div className={styles.badgeStackRight}>
            {salePercentOff != null && (
              <div className={`${styles.badgeRight} ${styles.saleBadge}`}>
                <span className={styles.saleLabel}>Sale</span>
                <span className={styles.salePercent}>-{salePercentOff}%</span>
              </div>
            )}

            {priority && (
              <div
                className={`${styles.badgeRight} ${styles[priority.toLowerCase()]}`}
              >
                {priority}
              </div>
            )}
          </div>

          <div className={styles.quickActions}>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.iconButton}
                onClick={(e) => e.stopPropagation()}
                aria-label="Open product link"
              >
                <ExternalLink size={16} />
              </a>
            )}

            {isOwner && (
              <div className={styles.menuWrapper} ref={menuRef}>
                <button
                  className={styles.iconButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label="Open item menu"
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                  <div className={styles.dropdown}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        if (onEdit) onEdit(item);
                      }}
                    >
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.dangerItem}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        if (onDelete) onDelete(item.id);
                      }}
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <h3>{title}</h3>
          <div className={styles.metaRow}>
            {formattedPrice && (
              <span className={styles.price}>{formattedPrice}</span>
            )}
            {store && <span className={styles.store}>{store}</span>}
          </div>

          {!isOwner && (
            <div className={styles.actionsRow}>
              <button
                className={`${styles.reserveBtn} ${isReserved ? styles.reserved : ""} ${onToggleBought ? styles.reserveCompact : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canToggleReservation && onToggleReserve)
                    onToggleReserve(item.id);
                }}
                disabled={!canToggleReservation}
              >
                <Heart size={16} fill={isReserved ? "currentColor" : "none"} />
                <span>
                  {isPurchased
                    ? "Purchased"
                    : isReserved
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
                    if (canToggleBought) onToggleBought(item.id);
                  }}
                  disabled={!canToggleBought}
                  aria-label={isPurchased ? "Mark as not purchased" : "Mark as purchased"}
                  title={isPurchased ? "Purchased" : "Mark as purchased"}
                >
                  <ShoppingCart size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <WishlistItemDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={item}
        isOwner={isOwner}
        onToggleReserve={onToggleReserve}
        onToggleBought={onToggleBought}
        reservedByName={reservedByName}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </>
  );
}
