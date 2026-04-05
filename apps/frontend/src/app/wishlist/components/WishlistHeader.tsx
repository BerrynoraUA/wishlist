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
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGT, useLocale } from "gt-next";
import { formatLocalizedShortDate } from "@/lib/helpers/format-localized-short-date";
import { Wishlist } from "@/types/wishlist";
import { Button } from "@/components/ui/Button/Button";
import { getAccent, visibilityIcon } from "@/lib/helpers/wishlist-helper";
import { useWishlistVisibilityLabels } from "@/lib/helpers/use-wishlist-visibility-labels";
import { useSubscription } from "@/hooks/use-subscription";
import { useUpdateWishlist } from "@/hooks/use-wishlists";
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
  const t = useGT();
  const locale = useLocale();
  const router = useRouter();
  const visibilityLabels = useWishlistVisibilityLabels();
  const { isPro } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showActions = Boolean(
    onShare || onManageAccess || onEdit || onDelete || isOwner,
  );
  const showMenu = Boolean(onEdit || onDelete);
  const hasImage = Boolean(wishlist.image_url);
  const visibility = visibilityLabels[wishlist.visibility_type];
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
  const atItemLimit = !isPro && itemsCount >= FREE_LIMITS.maxItemsPerWishlist;
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
    if (atItemLimit) {
      router.push("/subscription");
    } else {
      onAddItem?.();
    }
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
                aria-label={t("Back to home", { $id: "wishlist.header.backHome" })}
                data-tooltip={t("Back to home", { $id: "wishlist.header.backHome" })}
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.titleBlock}>
                {isInlineEditing ? (
                  <div className={styles.inlineEditorBlock}>
                    <input
                      className={styles.titleInput}
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      placeholder={t("Wishlist title", {
                        $id: "wishlist.header.titlePlaceholder"
                      })}
                      autoFocus
                      disabled={isUpdatingWishlist}
                    />
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineSaveButton}`}
                        onClick={saveInlineChanges}
                        disabled={!titleDraft.trim() || isUpdatingWishlist}
                        aria-label={t("Save wishlist changes", {
                          $id: "wishlist.header.saveChanges"
                        })}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineCancelButton}`}
                        onClick={cancelEditing}
                        disabled={isUpdatingWishlist}
                        aria-label={t("Cancel inline editing", {
                          $id: "wishlist.header.cancelInline"
                        })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.titleRow}>
                    <h1>{wishlist.title}</h1>
                  </div>
                )}

                {(description || canInlineEdit || isInlineEditing) &&
                  (isInlineEditing ? (
                    <textarea
                      className={styles.descriptionInput}
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      onKeyDown={handleDescriptionKeyDown}
                      placeholder={t("Add a short description", {
                        $id: "wishlist.header.descPlaceholder"
                      })}
                      disabled={isUpdatingWishlist}
                    />
                  ) : (
                    <div className={styles.descriptionRow}>
                      {description ? (
                        <p className={styles.description}>{description}</p>
                      ) : canInlineEdit ? (
                        <p className={styles.descriptionPlaceholder}>
                          {t("Add a short description", {
                            $id: "wishlist.header.descPlaceholderText"
                          })}
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
                    {itemsCount === 1
                      ? t("{n} item", { n: itemsCount, $id: "wishlist.itemCount.one" })
                      : t("{n} items", { n: itemsCount, $id: "wishlist.itemCount.other" })}
                  </span>
                  {eventDate && (
                    <span className={styles.dateBadge}>
                      <Calendar size={13} />
                      {formatLocalizedShortDate(eventDate, locale)}
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
                      {t("{current}/{max} items", {
                        current: itemsCount,
                        max: FREE_LIMITS.maxItemsPerWishlist,
                        $id: "wishlist.header.limitCounter"
                      })}
                    </span>
                  )}
                  <Button size="sm" onClick={handleAddItem}>
                    {atItemLimit ? (
                      <>
                        <Sparkles size={14} />
                        <span>
                          {t("Upgrade to Add", {
                            $id: "wishlist.header.upgradeToAdd"
                          })}
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>
                          {t("Add Item", { $id: "wishlist.header.addItem" })}
                        </span>
                      </>
                    )}
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
                          ? t("Cancel inline editing", {
                              $id: "wishlist.header.cancelInline"
                            })
                          : t("Inline edit wishlist", {
                              $id: "wishlist.header.inlineEditAria"
                            })
                      }
                      data-tooltip={
                        isInlineEditing
                          ? t("Cancel inline edit", {
                              $id: "wishlist.header.cancelInlineTooltip"
                            })
                          : t("Inline edit title and description", {
                              $id: "wishlist.header.inlineEditTooltip"
                            })
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
                      aria-label={t("Share wishlist", {
                        $id: "wishlist.header.shareAria"
                      })}
                      data-tooltip={t("Share wishlist", {
                        $id: "wishlist.header.shareTooltip"
                      })}
                    >
                      <Share2 size={18} />
                    </button>
                  )}
                  {onManageAccess && (
                    <button
                      type="button"
                      className={`${styles.menuButton} iconTooltipTrigger`}
                      onClick={onManageAccess}
                      aria-label={t("Manage wishlist access", {
                        $id: "wishlist.header.manageAccessAria"
                      })}
                      data-tooltip={t("Manage access", {
                        $id: "wishlist.header.manageAccessTooltip"
                      })}
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
                        aria-label={t("Wishlist actions", {
                          $id: "wishlist.header.moreAria"
                        })}
                        data-tooltip={t("More options", {
                          $id: "wishlist.header.moreTooltip"
                        })}
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
                              <span>{t("Edit", { $id: "common.edit" })}</span>
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
                              <span>
                                {t("Delete", { $id: "common.delete" })}
                              </span>
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
