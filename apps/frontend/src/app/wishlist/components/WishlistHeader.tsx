"use client";

import styles from "./WishlistHeader.module.scss";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Gift,
  KeyRound,
  MoreHorizontal,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Wishlist } from "@/types/wishlist";
import { Button } from "@/components/ui/Button/Button";
import {
  accentClass,
  visibilityIcon,
  visibilityLabel,
} from "@/lib/helpers/wishlist-helper";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";

type Props = {
  wishlist: Wishlist;
  onAddItem?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onManageAccess?: () => void;
  isOwner?: boolean;
};

export function WishlistHeader({
  wishlist,
  onAddItem,
  onEdit,
  onDelete,
  onShare,
  onManageAccess,
  isOwner = false,
}: Props) {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showActions = Boolean(onShare || onManageAccess || onEdit || onDelete);
  const showMenu = Boolean(onEdit || onDelete);
  const hasImage = Boolean(wishlist.image_url);
  const visibility = visibilityLabel[wishlist.visibility_type] ?? "Private";
  const VisibilityIcon = visibilityIcon[wishlist.visibility_type];
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const description = wishlist.description ?? "";
  const eventDate = (wishlist as Wishlist & { event_date?: string }).event_date;
  const canAddItem = Boolean(onAddItem);
  const atItemLimit = !isPro && itemsCount >= FREE_LIMITS.maxItemsPerWishlist;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleAddItem() {
    if (atItemLimit) {
      router.push("/subscription");
    } else {
      onAddItem?.();
    }
  }

  const accent = accentClass[wishlist.accent_type] ?? "pink";
  return (
    <div className={styles.header}>
      <div className={`${styles.banner} ${styles[accent]}`}>
        <div className={styles.bannerInner}>
          <div className={styles.heroLayout}>
            <div className={styles.heroMain}>
              <button
                type="button"
                className={`${styles.back} iconTooltipTrigger`}
                onClick={() => router.push("/home")}
                aria-label="Back to home"
                data-tooltip="Back to home"
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.titleBlock}>
                <h1>{wishlist.title}</h1>
                {description && (
                  <p className={styles.description}>{description}</p>
                )}

                <div className={styles.badges}>
                  <span className={styles.visibilityBadge}>
                    {VisibilityIcon && <VisibilityIcon size={13} />}
                    {visibility}
                  </span>
                  <span className={styles.countBadge}>
                    {itemsCount} {itemsCount === 1 ? "item" : "items"}
                  </span>
                  {eventDate && (
                    <span className={styles.dateBadge}>
                      <Calendar size={13} />
                      {new Date(eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.heroCenter}>
              <div className={styles.bannerIcon}>
                {hasImage ? (
                  <img
                    src={wishlist.image_url as string}
                    alt={wishlist.title}
                    className={styles.bannerIconImage}
                  />
                ) : (
                  <Gift size={28} />
                )}
              </div>
            </div>

            <div className={styles.heroAside}>
              {canAddItem && (
                <div className={styles.addItemArea}>
                  {!isPro && (
                    <span className={styles.limitCounter}>
                      {itemsCount}/{FREE_LIMITS.maxItemsPerWishlist} items
                    </span>
                  )}
                  <Button size="sm" onClick={handleAddItem}>
                    {atItemLimit ? (
                      <>
                        <Sparkles size={14} />
                        <span>Upgrade to Add</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Add Item</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {showActions && (
                <div className={styles.bannerActions}>
                  {onShare && (
                    <button
                      type="button"
                      className={`${styles.menuButton} iconTooltipTrigger`}
                      onClick={onShare}
                      aria-label="Share wishlist"
                      data-tooltip="Share wishlist"
                    >
                      <Share2 size={18} />
                    </button>
                  )}
                  {onManageAccess && (
                    <button
                      type="button"
                      className={`${styles.menuButton} iconTooltipTrigger`}
                      onClick={onManageAccess}
                      aria-label="Manage wishlist access"
                      data-tooltip="Manage access"
                    >
                      <KeyRound size={18} />
                    </button>
                  )}
                  {showMenu && (
                    <div className={styles.menuWrapper} ref={menuRef}>
                      <button
                        type="button"
                        className={`${styles.menuButton} iconTooltipTrigger`}
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Wishlist actions"
                        data-tooltip="More options"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuOpen && (
                        <div className={styles.menuDropdown}>
                          {onEdit && (
                            <button
                              type="button"
                              className={`${styles.menuItem} ${styles.editItem}`}
                              onClick={() => {
                                setMenuOpen(false);
                                onEdit();
                              }}
                            >
                              <span>Edit</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              className={`${styles.menuItem} ${styles.dangerItem}`}
                              onClick={() => {
                                setMenuOpen(false);
                                onDelete();
                              }}
                            >
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
