"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ReservedItemCard.module.scss";
import { ReservedItem } from "@/api/types/wishilst";
import { Heart, ExternalLink, MoreHorizontal, ShoppingCart } from "lucide-react";
import { ItemDetailModal } from "./ItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";

type Props = ReservedItem & {
  mode?: "reserved" | "purchased";
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  showDiscountBadge?: boolean;
};

export function ReservedItemCard({
  item_id,
  title,
  price,
  store,
  image,
  priority,
  owner_name,
  wishlist_title,
  status,
  share_url,
  url,
  discount_price,
  mode = "reserved",
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { data: currentUserId = "" } = useCurrentUserId();
  const isPurchased = status === 2;
  const isReserved = !isPurchased;
  const reservedBy = currentUserId;
  const canToggleReservation = !isPurchased;
  const canToggleBought = true;

  const imgSrc = image;
  const priceNumber = typeof price === "number" ? price : Number(price) || 0;
  const shareLink = share_url || url || "";
  const hasShareLink = Boolean(shareLink);
  const hasProductLink = Boolean(url);
  const priorityLabel: Record<string, "Low" | "Medium" | "High"> = {
    "1": "Low",
    "2": "Medium",
    "3": "High",
    Low: "Low",
    Medium: "Medium",
    High: "High",
  };
  const priorityDisplay = priority ? priorityLabel[String(priority)] || null : null;
  const priorityClass = priorityDisplay
    ? styles[priorityDisplay.toLowerCase() as "low" | "medium" | "high"]
    : "";

  const salePercentOff = (() => {
    if (!showDiscountBadge) return null;
    if (discount_price == null) return null;

    const discounted =
      typeof discount_price === "number"
        ? discount_price
        : Number.parseFloat(String(discount_price).replace(/[^0-9,.-]/g, "").replace(/,/g, "."));

    if (!Number.isFinite(discounted) || discounted <= 0) return null;
    if (priceNumber <= 0 || discounted >= priceNumber) return null;

    const raw = ((priceNumber - discounted) / priceNumber) * 100;
    const rounded = Math.round(raw);
    if (!Number.isFinite(rounded) || rounded <= 0) return null;
    return Math.min(99, rounded);
  })();

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
      console.error("Failed to share reserved item", error);
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <>
      <div
        className={`${styles.card} ${mode === "purchased" ? styles.cardPurchased : ""}`}
        onClick={() => setDetailOpen(true)}
      >
        <div className={styles.imageWrapper}>
          <div className={styles.imageFrame}>
          {imgSrc ? (
            <img src={imgSrc} alt={title} />
          ) : (
            <div className={styles.placeholder}>No image</div>
          )}
          </div>

          <div
            className={`${styles.badgeLeft} ${mode === "purchased" ? styles.badgeLeftPurchased : ""}`}
          >
            {isPurchased ? <ShoppingCart size={14} /> : <Heart size={14} fill="currentColor" />}
            <span>{isPurchased ? "Purchased by you" : "Reserved by you"}</span>
          </div>

          {salePercentOff != null && (
            <div className={styles.saleBadgeLeft}>Sale -{salePercentOff}%</div>
          )}

          {priorityDisplay && (
            <div className={`${styles.badgeRight} ${priorityClass}`}>{priorityDisplay}</div>
          )}

          <div className={styles.quickActions}>
            <a
              href={hasProductLink ? (url ?? "#") : "#"}
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
            <span className={styles.price}>${priceNumber.toFixed(2)}</span>
            {store && <span className={styles.store}>{store}</span>}
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.reserveBtn} ${styles.reserved} ${onToggleBought ? styles.reserveCompact : ""} ${mode === "purchased" ? styles.reservePurchased : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canToggleReservation && onToggleReserve)
                  onToggleReserve(item_id);
              }}
              disabled={!canToggleReservation}
              aria-label="Release reservation"
            >
              <Heart size={16} fill="currentColor" />
              <span>{isPurchased ? "Purchased" : "Reserved by you"}</span>
            </button>

            {onToggleBought && (
              <button
                className={`${styles.buyBtn} ${isPurchased ? styles.purchased : ""} ${mode === "purchased" ? styles.buyBtnPurchased : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canToggleBought) onToggleBought(item_id);
                }}
                aria-label={isPurchased ? "Mark as not purchased" : "Mark as purchased"}
                title={isPurchased ? "Purchased" : "Mark as purchased"}
              >
                <ShoppingCart size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ItemDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={{
          id: item_id,
          title,
          price: priceNumber,
          store,
          image: imgSrc,
          isReserved,
          status,
          url,
          share_url,
          description: null,
          priority: priorityDisplay ?? undefined,
          reservedBy,
          reservedByName: "you",
        }}
        onToggleReserve={onToggleReserve}
        onToggleBought={onToggleBought}
      />
    </>
  );
}
