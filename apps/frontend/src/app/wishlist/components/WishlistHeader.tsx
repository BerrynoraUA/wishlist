"use client";

import styles from "./WishlistHeader.module.scss";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Camera,
  Gift,
  Globe,
  KeyRound,
  Lock,
  MoreHorizontal,
  Plus,
  Sparkles,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGT, useLocale } from "gt-next";
import { formatLocalizedShortDate } from "@/lib/helpers/format-localized-short-date";
import { Wishlist, WishlistVisibility } from "@/types/wishlist";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { DropdownMenu, DropdownMenuItem,
} from "@/components/ui/DropdownMenu/DropdownMenu";
import { WISHLIST_VISIBILITY_ICONS, getWishlistAccentClass, getWishlistVisibilityLabels,
} from "@/lib/constans/wishlist";
import { useSubscription } from "@/hooks/use-subscription";
import { useUpdateWishlist } from "@/hooks/use-wishlists";
import { FREE_LIMITS } from "@/types/subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { Calendar } from "@/components/ui/Calendar/Calendar";
import { validateImageUploadFile } from "@/lib/image-upload";

type Props = {
  wishlist: Wishlist;
  onAddItem?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onManageAccess?: () => void;
  isOwner?: boolean;
  hasAddItemDraft?: boolean;
  hasEditWishlistDraft?: boolean;
};

export function WishlistHeader({
  wishlist,
  onAddItem,
  onEdit,
  onDelete,
  onShare,
  onManageAccess,
  isOwner = false,
  hasAddItemDraft = false,
  hasEditWishlistDraft = false,
}: Props) {
  const t = useGT();
  const locale = useLocale();
  const router = useRouter();
  const visibilityLabels = getWishlistVisibilityLabels(t);
  const { isPro } = useSubscription();
  const showActions = Boolean(
    onShare || onManageAccess || onEdit || onDelete || isOwner,
  );
  const showMenu = Boolean(onEdit || onDelete);
  const hasImage = Boolean(wishlist.image_url);
  const visibility = visibilityLabels[wishlist.visibility_type];
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[wishlist.visibility_type];
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
  const [editingDate, setEditingDate] = useState(false);
  const [editingVisibility, setEditingVisibility] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [titleDraft, setTitleDraft] = useState(wishlist.title);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);
  const visibilityPopoverRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(wishlist.title);
  }, [wishlist.title, editingTitle]);

  useEffect(() => {
    if (!editingDescription) setDescriptionDraft(description);
  }, [description, editingDescription]);

  useEffect(() => {
    if (!editingDate) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(e.target as Node)
      ) {
        setEditingDate(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingDate]);

  useEffect(() => {
    if (!editingVisibility) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        visibilityPopoverRef.current &&
        !visibilityPopoverRef.current.contains(e.target as Node)
      ) {
        setEditingVisibility(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingVisibility]);

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

  function handleDateSelect(dateKey: string) {
    if (isUpdatingWishlist) return;
    updateWishlist(
      {
        id: wishlist.id,
        updates: { event_date: new Date(dateKey + "T00:00:00") },
      },
      { onSuccess: () => setEditingDate(false) },
    );
  }

  function handleDateClear() {
    if (isUpdatingWishlist) return;
    updateWishlist(
      { id: wishlist.id, updates: { event_date: null } },
      { onSuccess: () => setEditingDate(false) },
    );
  }

  function handleImageClick() {
    if (!canInlineEdit || uploadingImage) return;
    imageInputRef.current?.click();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageUploadFile(file);
    if (validationError) return;
    setUploadingImage(true);
    updateWishlist(
      { id: wishlist.id, updates: { image: file } },
      {
        onSuccess: () => setUploadingImage(false),
        onError: () => setUploadingImage(false),
      },
    );
    e.target.value = "";
  }

  function handleVisibilityChange(newVisibility: WishlistVisibility) {
    if (isUpdatingWishlist) return;
    if (newVisibility === wishlist.visibility_type) {
      setEditingVisibility(false);
      return;
    }
    updateWishlist(
      { id: wishlist.id, updates: { visibility: newVisibility } },
      { onSuccess: () => setEditingVisibility(false) },
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

  const accent = getWishlistAccentClass(wishlist.accent_type);
  return (
    <div className={styles.header}>
      <div className={`${styles.banner} ${styles[accent]}`}>
        <div className={styles.bannerInner}>
          <div className={styles.heroLayout}>
            <div className={styles.heroMain}>
              <button
                type="button"
                className={`${styles.back} iconTooltipTrigger`}
                onClick={() => router.back()}
                aria-label={t("Back", {
                  $id: "wishlist.header.back",
                })}
                data-tooltip={t("Back", {
                  $id: "wishlist.header.back",
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
                        canInlineEdit ? startEditingDescription : undefined
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
                  <div
                    className={styles.badgeWrapper}
                    ref={visibilityPopoverRef}
                  >
                    <span
                      className={`${styles.visibilityBadge} ${wishlist.visibility_type === WishlistVisibility.FriendsOnly ? styles.friendsOnlyBadge : ""} ${canInlineEdit ? styles.editableBadge : ""}`.trim()}
                      onClick={
                        canInlineEdit
                          ? () => setEditingVisibility((v) => !v)
                          : undefined
                      }
                    >
                      {VisibilityIcon && <VisibilityIcon size={13} />}
                      {visibility}
                    </span>
                    {editingVisibility && (
                      <div className={styles.visibilityPopover}>
                        {(
                          [
                            {
                              value: WishlistVisibility.Public,
                              icon: Globe,
                              label:
                                visibilityLabels[WishlistVisibility.Public],
                            },
                            {
                              value: WishlistVisibility.FriendsOnly,
                              icon: Users,
                              label:
                                visibilityLabels[
                                  WishlistVisibility.FriendsOnly
                                ],
                            },
                            {
                              value: WishlistVisibility.Private,
                              icon: Lock,
                              label:
                                visibilityLabels[WishlistVisibility.Private],
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`${styles.visibilityOption} ${opt.value === wishlist.visibility_type ? styles.visibilityOptionActive : ""}`}
                            onClick={() => handleVisibilityChange(opt.value)}
                            disabled={isUpdatingWishlist}
                          >
                            <opt.icon size={14} />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                  <div className={styles.badgeWrapper} ref={datePopoverRef}>
                    {eventDate ? (
                      <span
                        className={`${styles.dateBadge} ${canInlineEdit ? styles.editableBadge : ""}`}
                        onClick={
                          canInlineEdit
                            ? () => setEditingDate((v) => !v)
                            : undefined
                        }
                      >
                        <CalendarIcon size={13} />
                        {formatLocalizedShortDate(eventDate, locale)}
                      </span>
                    ) : canInlineEdit ? (
                      <span
                        className={`${styles.dateBadge} ${styles.editableBadge} ${styles.dateBadgePlaceholder}`}
                        onClick={() => setEditingDate((v) => !v)}
                      >
                        <CalendarIcon size={13} />
                        {t("Add date", { $id: "wishlist.header.addDate" })}
                      </span>
                    ) : null}
                    {editingDate && (
                      <div className={styles.datePopover}>
                        <Calendar
                          selectedDate={eventDate || null}
                          onDateSelect={handleDateSelect}
                          initialDate={eventDate || null}
                        />
                        {eventDate && (
                          <button
                            type="button"
                            className={styles.dateClearBtn}
                            onClick={handleDateClear}
                            disabled={isUpdatingWishlist}
                          >
                            <X size={14} />
                            {t("Clear date", {
                              $id: "wishlist.header.clearDate",
                            })}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroCenter}>
              <div
                className={`${styles.bannerIcon} ${canInlineEdit ? styles.bannerIconEditable : ""}`}
                onClick={handleImageClick}
              >
                {uploadingImage ? (
                  <div className={styles.imageUploading} />
                ) : hasImage ? (
                  <img
                    src={wishlist.image_url as string}
                    alt={wishlist.title}
                    className={styles.bannerIconImage}
                  />
                ) : (
                  <Gift size={28} />
                )}
                {canInlineEdit && !uploadingImage && (
                  <div className={styles.imageOverlay}>
                    <Camera size={18} />
                  </div>
                )}
                {canInlineEdit && (
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleImageChange}
                  />
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
                        {hasAddItemDraft && <DraftBadge variant="dot" />}
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
                    <DropdownMenu
                      trigger={({ toggle }) => (
                        <button
                          type="button"
                          className={`${styles.menuButton} iconTooltipTrigger`}
                          onClick={toggle}
                          aria-label={t("Wishlist actions", {
                            $id: "wishlist.header.moreAria",
                          })}
                          data-tooltip={t("More options", {
                            $id: "wishlist.header.moreTooltip",
                          })}
                        >
                          <MoreHorizontal size={18} />
                          {hasEditWishlistDraft && (
                            <DraftBadge
                              variant="dot"
                              className={styles.menuButtonDraftDot}
                            />
                          )}
                        </button>
                      )}
                    >
                      {onEdit && (
                        <DropdownMenuItem
                          variant="edit"
                          onClick={() => onEdit()}
                        >
                          <span>{t("Edit", { $id: "common.edit" })}</span>
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          variant="danger"
                          onClick={() => onDelete()}
                        >
                          <span>{t("Delete", { $id: "common.delete" })}</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenu>
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
