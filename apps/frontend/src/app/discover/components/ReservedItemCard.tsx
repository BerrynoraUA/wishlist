"use client";

import { useEffect, useRef, useState } from "react";
import { useGT } from "gt-next";
import styles from "./ReservedItemCard.module.scss";
import { ReservedItem } from "@/api/types/wishilst";
import { ExternalLink, MoreHorizontal, ShoppingCart } from "lucide-react";
import { ItemDetailModal } from "./ItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";
import { formatItemPrice } from "@/lib/helpers/price-helper";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";

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
  currency,
  mode = "reserved",
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  const t = useGT();
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<ItemActionConfirmType | null>(null);
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
  const priorityKeyByValue: Record<string, "low" | "medium" | "high"> = {
    "1": "low",
    "2": "medium",
    "3": "high",
    Low: "low",
    Medium: "medium",
    High: "high",
  };
  const priorityKey = priority
    ? (priorityKeyByValue[String(priority)] ?? null)
    : null;
  const priorityClass = priorityKey ? styles[priorityKey] : "";
  const priorityDisplay =
    priorityKey === "low"
      ? t("Low", { $id: "discover.reserved.priorityLow" })
      : priorityKey === "medium"
        ? t("Medium", { $id: "discover.reserved.priorityMedium" })
        : priorityKey === "high"
          ? t("High", { $id: "discover.reserved.priorityHigh" })
          : null;
  const priorityEnum: "Low" | "Medium" | "High" | undefined =
    priorityKey === "low"
      ? "Low"
      : priorityKey === "medium"
        ? "Medium"
        : priorityKey === "high"
          ? "High"
          : undefined;

  const salePercentOff = (() => {
    if (!showDiscountBadge) return null;
    if (discount_price == null) return null;

    const discounted =
      typeof discount_price === "number"
        ? discount_price
        : Number.parseFloat(
            String(discount_price)
              .replace(/[^0-9,.-]/g, "")
              .replace(/,/g, "."),
          );

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
    } catch {
    } finally {
      setMenuOpen(false);
    }
  };

  const handleReserveClick = () => {
    if (!canToggleReservation || !onToggleReserve) return;
    setConfirmAction("unreserve");
  };

  const handleBoughtClick = () => {
    if (!canToggleBought || !onToggleBought) return;
    setConfirmAction(isPurchased ? "unpurchase" : "purchase");
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction === "reserve" || confirmAction === "unreserve") {
      onToggleReserve?.(item_id);
    } else {
      onToggleBought?.(item_id);
    }

    setConfirmAction(null);
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
              <div className={styles.placeholder}>
                {t("No image", { $id: "discover.reserved.noImage" })}
              </div>
            )}
          </div>

          <div
            className={`${styles.badgeLeft} ${mode === "purchased" ? styles.badgeLeftPurchased : ""}`}
          >
            {isPurchased ? (
              <ShoppingCart size={14} />
            ) : (
              <ReservationLockIcon isReserved={true} size={14} />
            )}
            <span>
              {isPurchased
                ? t("Purchased by you", {
                    $id: "discover.reserved.purchasedByYouBadge",
                  })
                : t("Reserved by you", {
                    $id: "discover.reserved.reservedByYouBadge",
                  })}
            </span>
          </div>

          {salePercentOff != null && (
            <div className={styles.saleBadgeLeft}>
              {t("Sale -{percent}%", {
                percent: salePercentOff,
                $id: "discover.reserved.saleBadge",
              })}
            </div>
          )}

          {priorityDisplay && (
            <div className={`${styles.badgeRight} ${priorityClass}`}>
              {priorityDisplay}
            </div>
          )}

          <div className={styles.quickActions}>
            <SaveToWishlistButton
              item={{
                name: title,
                description: null,
                price: price != null ? String(price) : null,
                image_url: image || null,
                url: url ?? null,
                priority:
                  typeof priority === "number"
                    ? priority
                    : priority === "High"
                      ? 3
                      : priority === "Medium"
                        ? 2
                        : priority === "Low"
                          ? 1
                          : null,
                discount_price:
                  discount_price != null ? String(discount_price) : null,
                has_discount: discount_price != null,
                currency: currency ?? null,
              }}
              className={styles.iconButton}
            />
            <a
              href={hasProductLink ? (url ?? "#") : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.iconButton} ${!hasProductLink ? styles.disabled : ""} iconTooltipTrigger`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasProductLink) e.preventDefault();
              }}
              aria-label={t("Open product link", {
                $id: "discover.reserved.openProductAria",
              })}
              aria-disabled={!hasProductLink}
              data-tooltip={t("Open product link", {
                $id: "discover.reserved.openProductTooltip",
              })}
            >
              <ExternalLink size={16} />
            </a>

            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                className={`${styles.iconButton} ${!hasShareLink ? styles.disabled : ""} iconTooltipTrigger`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasShareLink) return;
                  setMenuOpen((prev) => !prev);
                }}
                aria-label={t("Open item menu", {
                  $id: "discover.reserved.menuAria",
                })}
                aria-disabled={!hasShareLink}
                data-tooltip={t("More options", {
                  $id: "discover.reserved.moreOptionsTooltip",
                })}
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
                    <span>
                      {t("Share", { $id: "discover.reserved.share" })}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.info}>
          <strong title={title}>{title}</strong>
          <div className={styles.metaRow}>
            {price != null && price !== 0 && (
              <span className={styles.price}>
                {formatItemPrice(price, currency)}
              </span>
            )}
            {store && (
              <span className={styles.store} title={store}>
                {store}
              </span>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.reserveBtn} ${styles.reserved} ${onToggleBought ? styles.reserveCompact : ""} ${mode === "purchased" ? styles.reservePurchased : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleReserveClick();
              }}
              disabled={!canToggleReservation}
              aria-label={t("Release reservation", {
                $id: "discover.reserved.releaseAria",
              })}
            >
              <ReservationLockIcon
                isReserved={true}
                size={16}
                animateOnReserve
              />
              <span>
                {isPurchased
                  ? t("Purchased", { $id: "discover.reserved.purchasedBtn" })
                  : t("Reserved by you", {
                      $id: "discover.reserved.reservedByYouBtn",
                    })}
              </span>
            </button>

            {onToggleBought && (
              <button
                className={`${styles.buyBtn} ${isPurchased ? styles.purchased : ""} ${mode === "purchased" ? styles.buyBtnPurchased : ""} iconTooltipTrigger`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBoughtClick();
                }}
                aria-label={
                  isPurchased
                    ? t("Mark as not purchased", {
                        $id: "discover.reserved.unpurchaseAria",
                      })
                    : t("Mark as purchased", {
                        $id: "discover.reserved.purchaseAria",
                      })
                }
                title={
                  isPurchased
                    ? t("Purchased", {
                        $id: "discover.reserved.purchasedTitle",
                      })
                    : t("Mark as purchased", {
                        $id: "discover.reserved.purchaseTitle",
                      })
                }
                data-tooltip={
                  isPurchased
                    ? t("Mark as not purchased", {
                        $id: "discover.reserved.unpurchaseTooltip",
                      })
                    : t("Mark as purchased", {
                        $id: "discover.reserved.purchaseTooltip",
                      })
                }
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
          priority: priorityEnum,
          reservedBy,
          reservedByName: "you",
          currency,
        }}
        onToggleReserve={onToggleReserve}
        onToggleBought={onToggleBought}
      />

      <ActionConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        action={confirmAction ?? "reserve"}
        itemName={title}
      />
    </>
  );
}
