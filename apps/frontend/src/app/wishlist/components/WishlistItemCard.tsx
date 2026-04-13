"use client";

import styles from "./WishlistItemCard.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGT } from "gt-next";
import { Item } from "@/types/item";
import { ExternalLink, ShoppingBag, ShoppingCart, MoreHorizontal, ThumbsUp } from "lucide-react";
import { WishlistItemDetailModal } from "./WishlistItemDetailModal";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";

type Props = {
  item: Item;
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  reservedByName?: string | null;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
  autoOpen?: boolean;
  onAutoOpenHandled?: (id: string) => void;
  voteCount?: number;
  hasVoted?: boolean;
  onToggleVote?: (id: string) => void;
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
  autoOpen = false,
  onAutoOpenHandled,
  voteCount = 0,
  hasVoted = false,
  onToggleVote,
}: Props) {
  const t = useGT();
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ItemActionConfirmType | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { data: currentUserId = "" } = useCurrentUserId();

  const isPurchased = item.status === 2;
  const isReserved = item.status === 1 || (!isPurchased && !!item.reserved_by);
  const reservedByMe = currentUserId ? item.reserved_by === currentUserId : false;
  const canToggleReservation = !isOwner && !isPurchased && (!isReserved || reservedByMe);
  const canToggleBought =
    !isOwner && ((isPurchased && reservedByMe) || (!isPurchased && (!isReserved || reservedByMe)));
  const hasImage = Boolean(item.image_url);
  const price = item.price || "";
  const title = item.name;
  const priorityKeyByValue: Record<number, "Low" | "Medium" | "High"> = {
    1: "Low",
    2: "Medium",
    3: "High",
  };

  const priorityKey = item.priority ? priorityKeyByValue[item.priority] : null;

  const priorityDisplay = useMemo(() => {
    if (!priorityKey) return null;
    if (priorityKey === "Low") return t("Low", { $id: "item.priority.low" });
    if (priorityKey === "Medium") return t("Medium", { $id: "item.priority.medium" });
    return t("High", { $id: "item.priority.high" });
  }, [priorityKey, t]);
  const store = (() => {
    if (!item.url) return "";
    try {
      return new URL(item.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  const { formatPrice } = useCurrencyFormatter();
  const formattedPrice = formatPrice(price, item.currency);

  function parsePriceToNumber(value: string | null | undefined): number | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const safe = trimmed.replace(/[^0-9,.-]/g, "");
    if (!safe) return null;

    const hasComma = safe.includes(",");
    const hasDot = safe.includes(".");

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
      ? t("Purchased by you", { $id: "item.status.purchasedByYou" })
      : reservedByName
        ? t("Purchased by {name}", {
            name: reservedByName,
            $id: "item.status.purchasedByName",
          })
        : t("Purchased", { $id: "item.status.purchased" })
    : isReserved
      ? reservedByMe
        ? t("Reserved by you", { $id: "item.status.reservedByYou" })
        : reservedByName
          ? t("Reserved by {name}", {
              name: reservedByName,
              $id: "item.status.reservedByName",
            })
          : t("Reserved", { $id: "item.status.reserved" })
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

  useEffect(() => {
    if (!autoOpen) return;

    setDetailOpen(true);
    onAutoOpenHandled?.(item.id);
  }, [autoOpen, item.id, onAutoOpenHandled]);

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
              className={`${styles.badgeLeft} ${salePercentOff != null ? styles.badgeLeftCompact : ""} ${isPurchased ? styles.purchasedBadge : ""}`}
            >
              {isPurchased ? (
                <ShoppingCart size={14} />
              ) : (
                <ReservationLockIcon isReserved={true} size={14} />
              )}
              {salePercentOff == null && <span>{reserveStatusLabel}</span>}
            </div>
          )}

          <div className={styles.badgeStackRight}>
            {salePercentOff != null && (
              <div className={`${styles.badgeRight} ${styles.saleBadge}`}>
                <span className={styles.saleLabel}>{t("Sale", { $id: "item.card.sale" })}</span>
                <span className={styles.salePercent}>-{salePercentOff}%</span>
              </div>
            )}

            {priorityKey && (
              <div className={`${styles.badgeRight} ${styles[priorityKey.toLowerCase()]}`}>
                {priorityDisplay}
              </div>
            )}
          </div>

          <div className={styles.quickActions}>
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
                className={`${styles.iconButton} iconTooltipTrigger`}
              />
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.iconButton} iconTooltipTrigger`}
                onClick={(e) => e.stopPropagation()}
                aria-label={t("Open product link", {
                  $id: "item.card.openProductLink",
                })}
                data-tooltip={t("Open product link", {
                  $id: "item.card.openProductLink",
                })}
              >
                <ExternalLink size={16} />
              </a>
            )}

            {isOwner && (
              <div className={styles.menuWrapper} ref={menuRef}>
                <button
                  className={`${styles.iconButton} iconTooltipTrigger`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label={t("Open item menu", {
                    $id: "item.card.openItemMenu",
                  })}
                  data-tooltip={t("More options", {
                    $id: "item.card.moreOptions",
                  })}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                  <div className={styles.dropdown}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.editItem}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        if (onEdit) onEdit(item);
                      }}
                    >
                      <span>{t("Edit", { $id: "common.edit" })}</span>
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
                      <span>{t("Delete", { $id: "common.delete" })}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <h3 title={title}>{title}</h3>
          {item.description && <p className={styles.description}>{item.description}</p>}
          <div className={styles.metaRow}>
            {formattedPrice && <span className={styles.price}>{formattedPrice}</span>}
            {store && (
              <span className={styles.store} title={store}>
                {store}
              </span>
            )}
          </div>

          {!isOwner && onToggleVote && (
            <button
              className={`${styles.voteBtn} ${hasVoted ? styles.voted : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVote(item.id);
              }}
            >
              <ThumbsUp size={14} />
              {voteCount > 0 && <span className={styles.voteCount}>{voteCount}</span>}
            </button>
          )}

          {!isOwner && (
            <div className={styles.actionsRow}>
              <button
                className={`${styles.reserveBtn} ${isReserved ? styles.reserved : ""} ${onToggleBought ? styles.reserveCompact : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReserveClick();
                }}
                disabled={!canToggleReservation}
              >
                <ReservationLockIcon isReserved={isReserved} size={16} animateOnReserve />
                <span>
                  {isPurchased
                    ? t("Purchased", { $id: "item.status.purchased" })
                    : isReserved
                      ? reservedByMe
                        ? t("Reserved by you", {
                            $id: "item.status.reservedByYou",
                          })
                        : t("Reserved", { $id: "item.status.reserved" })
                      : t("Reserve this gift", {
                          $id: "item.detail.reserveThisGift",
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
                  data-tooltip={
                    isPurchased
                      ? t("Mark as not purchased", {
                          $id: "item.card.markNotPurchased",
                        })
                      : t("Mark as purchased", {
                          $id: "item.card.markPurchased",
                        })
                  }
                  aria-label={
                    isPurchased
                      ? t("Mark as not purchased", {
                          $id: "item.card.markNotPurchased",
                        })
                      : t("Mark as purchased", {
                          $id: "item.card.markPurchased",
                        })
                  }
                  title={
                    isPurchased
                      ? t("Purchased", { $id: "item.status.purchased" })
                      : t("Mark as purchased", {
                          $id: "item.card.markPurchased",
                        })
                  }
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
