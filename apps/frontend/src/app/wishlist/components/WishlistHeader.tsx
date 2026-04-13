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
  Sparkles,
  Share2,
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
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

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
  const atItemLimit =
    SUBSCRIPTIONS_UI_ENABLED &&
    !isPro &&
    itemsCount >= FREE_LIMITS.maxItemsPerWishlist;
  const canInlineEdit = isOwner;
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState(wishlist.title);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (!editingTitle) setTitleDraft(wishlist.title);
  }, [wishlist.title, editingTitle]);

  useEffect(() => {
    if (!editingDescription) setDescriptionDraft(description);
  }, [description, editingDescription]);

  function handleAddItem() {
    if (atItemLimit) {
      router.push("/subscription");
      return;
    }

    onAddItem?.();
  }

  function startEditingTitle() {
    setEditingTitle(true);
    setTitleDraft(wishlist.title);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }

  function startEditingDescription() {
    setEditingDescription(true);
    setDescriptionDraft(description);
    requestAnimationFrame(() => descriptionInputRef.current?.focus());
  }

  function saveTitleChange() {
    if (isUpdatingWishlist) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(wishlist.title);
      setEditingTitle(false);
      return;
    }
    if (nextTitle === wishlist.title) {
      setEditingTitle(false);
      return;
    }
    updateWishlist(
      { id: wishlist.id, updates: { title: nextTitle } },
      { onSuccess: () => setEditingTitle(false) },
    );
  }

  function saveDescriptionChange() {
    if (isUpdatingWishlist) return;
    const nextDescription = descriptionDraft.trim();
    if (nextDescription === description) {
      setEditingDescription(false);
      return;
    }
    updateWishlist(
      { id: wishlist.id, updates: { description: nextDescription } },
      { onSuccess: () => setEditingDescription(false) },
    );
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      titleInputRef.current?.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTitleDraft(wishlist.title);
      setEditingTitle(false);
    }
  }

  function handleDescriptionKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setDescriptionDraft(description);
      setEditingDescription(false);
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
                aria-label={t("Back to home", {
                  $id: "wishlist.header.backHome",
                })}
                data-tooltip={t("Back to home", {
                  $id: "wishlist.header.backHome",
                })}
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.titleBlock}>
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    className={styles.titleInput}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={saveTitleChange}
                    placeholder={t("Wishlist title", {
                      $id: "wishlist.header.titlePlaceholder",
                    })}
                    autoFocus
                    disabled={isUpdatingWishlist}
                  />
                ) : (
                  <div
                    className={styles.titleRow}
                    onDoubleClick={
                      canInlineEdit ? startEditingTitle : undefined
                    }
                  >
                    <h1
                      className={
                        canInlineEdit ? styles.editableText : undefined
                      }
                    >
                      {wishlist.title}
                    </h1>
                  </div>
                )}

                {(description || canInlineEdit) &&
                  (editingDescription ? (
                    <textarea
                      ref={descriptionInputRef}
                      className={styles.descriptionInput}
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      onKeyDown={handleDescriptionKeyDown}
                      onBlur={saveDescriptionChange}
                      placeholder={t("Add a short description", {
                        $id: "wishlist.header.descPlaceholder",
                      })}
                      autoFocus
                      disabled={isUpdatingWishlist}
                    />
                  ) : (
                    <div
                      className={styles.descriptionRow}
                      onDoubleClick={
                        canInlineEdit
                          ? startEditingDescription
                          : undefined
                      }
                    >
                      {description ? (
                        <p
                          className={`${styles.description} ${canInlineEdit ? styles.editableText : ""}`}
                        >
                          {description}
                        </p>
                      ) : canInlineEdit ? (
                        <p
                          className={`${styles.descriptionPlaceholder} ${styles.editableText}`}
                        >
                          {t("Add a short description", {
                            $id: "wishlist.header.descPlaceholderText",
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
                      ? t("{n} item", {
                          n: itemsCount,
                          $id: "wishlist.itemCount.one",
                        })
                      : t("{n} items", {
                          n: itemsCount,
                          $id: "wishlist.itemCount.other",
                        })}
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
                  {SUBSCRIPTIONS_UI_ENABLED && !isPro && (
                    <span className={styles.limitCounter}>
                      {t("{current}/{max} items", {
                        current: itemsCount,
                        max: FREE_LIMITS.maxItemsPerWishlist,
                        $id: "wishlist.header.limitCounter",
                      })}
                    </span>
                  )}
                  <Button size="sm" onClick={handleAddItem}>
                    {atItemLimit ? (
                      <>
                        <Sparkles size={14} />
                        <span>
                          {t("Upgrade to Add", {
                            $id: "wishlist.header.upgradeToAdd",
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
                  {onShare && (
                    <button
                      type="button"
                      className={`${styles.menuButton} iconTooltipTrigger`}
                      onClick={onShare}
                      aria-label={t("Share wishlist", {
                        $id: "wishlist.header.shareAria",
                      })}
                      data-tooltip={t("Share wishlist", {
                        $id: "wishlist.header.shareTooltip",
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
                        $id: "wishlist.header.manageAccessAria",
                      })}
                      data-tooltip={t("Manage access", {
                        $id: "wishlist.header.manageAccessTooltip",
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
                          $id: "wishlist.header.moreAria",
                        })}
                        data-tooltip={t("More options", {
                          $id: "wishlist.header.moreTooltip",
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
