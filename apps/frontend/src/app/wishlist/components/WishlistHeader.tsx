"use client";

import styles from "./WishlistHeader.module.scss";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Gift,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Wishlist } from "@/types/wishlist";
import { Button } from "@/components/ui/Button/Button";
import {
  getAccent,
  visibilityIcon,
  visibilityLabel,
} from "@/lib/helpers/wishlist-helper";
import { useUpdateWishlist } from "@/hooks/use-wishlists";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showActions = Boolean(
    onShare || onManageAccess || onEdit || onDelete || isOwner,
  );
  const showMenu = Boolean(onEdit || onDelete);
  const hasImage = Boolean(wishlist.image_url);
  const visibility = visibilityLabel[wishlist.visibility_type] ?? "Private";
  const VisibilityIcon = visibilityIcon[wishlist.visibility_type];
  const { mutate: updateWishlist, isPending: isUpdatingWishlist } =
    useUpdateWishlist();
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const description = wishlist.description ?? "";
  const eventDate = (wishlist as Wishlist & { event_date?: string }).event_date;
  const canAddItem = Boolean(onAddItem);
  const canInlineEdit = isOwner;
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(wishlist.title);
  const [descriptionDraft, setDescriptionDraft] = useState(description);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!isInlineEditing) {
      setTitleDraft(wishlist.title);
      setDescriptionDraft(description);
    }
  }, [wishlist.title, description, isInlineEditing]);

  function handleAddItem() {
    onAddItem?.();
  }

  function startEditing() {
    setMenuOpen(false);
    setIsInlineEditing(true);
  }

  function cancelEditing() {
    setIsInlineEditing(false);
    setTitleDraft(wishlist.title);
    setDescriptionDraft(description);
  }

  function saveInlineChanges() {
    if (isUpdatingWishlist) return;

    const nextTitle = titleDraft.trim();
    const nextDescription = descriptionDraft.trim();

    if (!nextTitle) {
      return;
    }

    if (nextTitle === wishlist.title && nextDescription === description) {
      setIsInlineEditing(false);
      return;
    }

    updateWishlist(
      {
        id: wishlist.id,
        updates: {
          title: nextTitle,
          description: nextDescription,
        },
      },
      {
        onSuccess: () => {
          setIsInlineEditing(false);
        },
      },
    );
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveInlineChanges();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  function handleDescriptionKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      saveInlineChanges();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  const accent = getAccent(wishlist.accent_type);
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
                {isInlineEditing ? (
                  <div className={styles.inlineEditorBlock}>
                    <div className={styles.inlineEditorFields}>
                      <input
                        className={styles.titleInput}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        placeholder="Wishlist title"
                        autoFocus
                        disabled={isUpdatingWishlist}
                      />
                      <textarea
                        className={styles.descriptionInput}
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        onKeyDown={handleDescriptionKeyDown}
                        placeholder="Add a short description"
                        disabled={isUpdatingWishlist}
                      />
                    </div>
                    <div className={styles.inlineActions}>
                      <div className={styles.inlineActionButtons}>
                        <button
                          type="button"
                          className={`${styles.inlineActionButton} ${styles.inlineCancelButton}`}
                          onClick={cancelEditing}
                          disabled={isUpdatingWishlist}
                          aria-label="Cancel inline editing"
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.inlineActionButton} ${styles.inlineSaveButton}`}
                          onClick={saveInlineChanges}
                          disabled={!titleDraft.trim() || isUpdatingWishlist}
                          aria-label="Save wishlist changes"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.titleRow}>
                    <h1>{wishlist.title}</h1>
                  </div>
                )}

                {(description || canInlineEdit || isInlineEditing) &&
                  (isInlineEditing ? null : (
                    <div className={styles.descriptionRow}>
                      {description ? (
                        <p className={styles.description}>{description}</p>
                      ) : canInlineEdit ? (
                        <p className={styles.descriptionPlaceholder}>
                          Add a short description
                        </p>
                      ) : null}
                    </div>
                  ))}

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
                  <Button size="sm" onClick={handleAddItem}>
                    <Plus size={14} />
                    <span>Add Item</span>
                  </Button>
                </div>
              )}

              {showActions && (
                <div className={styles.bannerActions}>
                  {canInlineEdit && (
                    <button
                      type="button"
                      className={`${styles.menuButton} ${styles.editToggleButton} ${isInlineEditing ? styles.editToggleButtonActive : ""} iconTooltipTrigger`}
                      onClick={() => {
                        if (isInlineEditing) {
                          cancelEditing();
                        } else {
                          startEditing();
                        }
                      }}
                      aria-label={
                        isInlineEditing
                          ? "Cancel inline editing"
                          : "Inline edit wishlist"
                      }
                      data-tooltip={
                        isInlineEditing
                          ? "Cancel inline edit"
                          : "Inline edit title and description"
                      }
                    >
                      <Pencil size={18} />
                    </button>
                  )}
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
