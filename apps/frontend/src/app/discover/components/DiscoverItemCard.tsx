"use client";

import { useEffect, useRef, useState } from "react";
import { useGT } from "gt-next";
import styles from "./DiscoverItemCard.module.scss";
import { DiscoverItem } from "@/api/types/wishilst";
import { ExternalLink, MoreHorizontal, ShoppingCart } from "lucide-react";
import { ItemDetailModal } from "./ItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";

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
  currency,
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
  const reservedByValue =
    (reservedBy ?? reserved_by ?? null)?.toString() ?? null;
  const isPurchased = status === 2;
  const isReservedState =
    isReserved || status === 1 || (!!reservedByValue && !isPurchased);
  const reservedByMe = !!reservedByValue && reservedByValue === currentUserId;
  const canToggleReservation =
    !isPurchased && (reservedByMe || !isReservedState);
  const canToggleBought =
    (isPurchased && reservedByMe) ||
    (!isPurchased && (!isReservedState || reservedByMe));
  const imgSrc = image_url || image;
  const shareLink = share_url || url || "";
  const hasShareLink = Boolean(shareLink);
  const hasProductLink = Boolean(url);
  const { formatPrice } = useCurrencyFormatter();
  const formattedPrice = formatPrice(price, currency);

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
      ? t("Purchased by you", { $id: "discover.item.purchasedByYouStatus" })
      : reservedByName
        ? t("Purchased by {name}", {
            name: reservedByName,
            $id: "discover.item.purchasedByNameStatus",
          })
        : t("Purchased", { $id: "discover.item.purchasedStatus" })
    : isReservedState
      ? reservedByMe
        ? t("Reserved by you", { $id: "discover.item.reservedByYouStatus" })
        : reservedByName
          ? t("Reserved by {name}", {
              name: reservedByName,
              $id: "discover.item.reservedByNameStatus",
            })
          : t("Reserved", { $id: "discover.item.reservedStatus" })
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
    } catch {
    } finally {
      setMenuOpen(false);
    }
  };

  const handleReserveClick = () => {
    if (!canToggleReservation || !onToggleReserve) return;
    setConfirmAction(isReservedState ? "unreserve" : "reserve");
  };

  const handleBoughtClick = () => {
    if (!canToggleBought || !onToggleBought) return;
    setConfirmAction(isPurchased ? "unpurchase" : "purchase");
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction === "reserve" || confirmAction === "unreserve") {
      onToggleReserve?.(id);
    } else {
      onToggleBought?.(id);
    }

    setConfirmAction(null);
  };

  return (
    <>
      <div className={styles.card} onClick={() => setDetailOpen(true)}>
        {salePercentOff != null && (
          <span className={styles.saleBadge}>
            {t("Sale -{percent}%", {
              percent: salePercentOff,
              $id: "discover.item.saleBadge",
            })}
          </span>
        )}
        {priority && <span className={styles.priority}>{priority}</span>}

        <div className={styles.imageWrapper}>
          {imgSrc ? (
            <img src={imgSrc} alt={title} />
          ) : (
            <div className={styles.placeholder}>
              {t("No image", { $id: "discover.item.noImage" })}
            </div>
          )}

          <div className={styles.quickActions}>
            <SaveToWishlistButton
              item={{
                name: title,
                description: description ?? null,
                price: price != null ? String(price) : null,
                image_url: imgSrc || null,
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
                $id: "discover.item.openProductAria",
              })}
              aria-disabled={!hasProductLink}
              data-tooltip={t("Open product link", {
                $id: "discover.item.openProductTooltip",
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
                  $id: "discover.item.menuAria",
                })}
                aria-disabled={!hasShareLink}
                data-tooltip={t("More options", {
                  $id: "discover.item.moreOptionsTooltip",
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
                      {t("Share", { $id: "discover.item.share" })}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.info}>
          <strong>{title}</strong>

          <div className={styles.metaRow}>
            {formattedPrice && (
              <span className={styles.price}>{formattedPrice}</span>
            )}
            {store && <span className={styles.store}>{store}</span>}
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.reserveBtn} ${isReservedState ? styles.reserved : ""} ${onToggleBought ? styles.reserveCompact : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleReserveClick();
              }}
              disabled={!canToggleReservation}
            >
              <ReservationLockIcon
                isReserved={isReservedState}
                size={16}
                animateOnReserve
              />
              <span>
                {isPurchased
                  ? t("Purchased", { $id: "discover.item.purchasedBtn" })
                  : isReservedState
                    ? reservedByMe
                      ? t("Reserved by you", {
                          $id: "discover.item.reservedByYouBtn",
                        })
                      : t("Reserved", { $id: "discover.item.reservedBtn" })
                    : t("Reserve this gift", {
                        $id: "discover.item.reserveGift",
                      })}
              </span>
            </button>

            {onToggleBought && (
              <button
                className={`${styles.buyBtn} ${isPurchased ? styles.purchased : ""} iconTooltipTrigger`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBoughtClick();
                }}
                disabled={!canToggleBought}
                aria-label={
                  isPurchased
                    ? t("Mark as not purchased", {
                        $id: "discover.item.unpurchaseAria",
                      })
                    : t("Mark as purchased", {
                        $id: "discover.item.purchaseAria",
                      })
                }
                title={
                  reserveStatusLabel ??
                  t("Mark as purchased", {
                    $id: "discover.item.purchaseTitle",
                  })
                }
                data-tooltip={
                  isPurchased
                    ? t("Mark as not purchased", {
                        $id: "discover.item.unpurchaseTooltip",
                      })
                    : t("Mark as purchased", {
                        $id: "discover.item.purchaseTooltip",
                      })
                }
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
