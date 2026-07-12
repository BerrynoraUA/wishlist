"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGT } from "gt-next";
import { Check, Loader2, Plus, X, Lock, Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { Heading } from "@/components/ui/Typography";
import { Select } from "@/components/ui/Select/Select";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";
import { useUpdateItem } from "@/hooks/use-items";
import { useSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { Item, ItemLink } from "@/types/item";
import type { UpdateItemParams } from "@/api/types/item";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { validateImageUploadFile } from "@/lib/image-upload";
import { getCompactCurrencyOptions, resolveCurrency } from "@/lib/helpers/form-select-options";
import { ALL_PRIORITIES } from "@/lib/priorities";
import { PRIORITY_ICONS } from "@/lib/priority-icons";
import { isStarCardColorIndex, ITEM_COLORS, STAR_CARD_COLOR_INDEX } from "@/lib/item-colors";
import styles from "../create-item-modal/CreateItemModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  item: Item;
};

type EditItemDraft = {
  name: string;
  description: string;
  price: string;
  priority: string | null;
  colorIndex: number | null;
  link: string;
  additionalLinks: ItemLink[];
  imagePreview: string;
  currency: string;
  hadLocalImage: boolean;
};

type RestoredEditItemFields = {
  link: boolean;
  additionalLinks: boolean;
  image: boolean;
  name: boolean;
  description: boolean;
  price: boolean;
  currency: boolean;
  priority: boolean;
  colorIndex: boolean;
};

const EMPTY_RESTORED_EDIT_ITEM_FIELDS: RestoredEditItemFields = {
  link: false,
  additionalLinks: false,
  image: false,
  name: false,
  description: false,
  price: false,
  currency: false,
  priority: false,
  colorIndex: false,
};

export function EditItemModal({ open, onClose, item }: Props) {
  if (!open) return null;

  return <EditItemForm open={open} item={item} onClose={onClose} />;
}

function EditItemForm({ open, item, onClose }: { open: boolean; item: Item; onClose: () => void }) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { isPro } = useSubscription();
  const { data: settings } = useSettings();
  const canUsePriority = !SUBSCRIPTIONS_UI_ENABLED || isPro;
  const canUseMultipleLinks = !SUBSCRIPTIONS_UI_ENABLED || isPro;
  const currencyOptions = getCompactCurrencyOptions("code");
  const visiblePriorities = settings?.selected_priorities
    ? ALL_PRIORITIES.filter((p) => settings.selected_priorities!.includes(p.id))
    : ALL_PRIORITIES;
  const priorityOptions = [
    {
      value: "",
      label: (
        <span className={styles.prioritySelectName}>
          {t("No priority", { $id: "item.modal.priorityNone" })}
        </span>
      ),
      leading: (
        <span
          className={`${styles.prioritySelectIcon} ${styles.prioritySelectIconNone}`}
          style={
            {
              "--priority-color": "var(--color-text-muted)",
            } as React.CSSProperties
          }
        >
          <X size={14} strokeWidth={2.5} />
        </span>
      ),
      trailing: (active: boolean) => (
        <span className={`${styles.prioritySelectCheck} ${active ? styles.checked : ""}`}>
          {active && <Check size={10} strokeWidth={3} />}
        </span>
      ),
    },
    ...visiblePriorities.map((p) => {
      const Icon = PRIORITY_ICONS[p.id];

      return {
        value: p.id,
        label: <span className={styles.prioritySelectName}>{p.name}</span>,
        leading: (
          <span
            className={styles.prioritySelectIcon}
            style={{ "--priority-color": p.color } as React.CSSProperties}
          >
            {Icon && <Icon size={14} strokeWidth={2.5} />}
          </span>
        ),
        trailing: (active: boolean) => (
          <span className={`${styles.prioritySelectCheck} ${active ? styles.checked : ""}`}>
            {active && <Check size={10} strokeWidth={3} />}
          </span>
        ),
      };
    }),
  ];
  const initialDraft = useMemo<EditItemDraft>(
    () => ({
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.price ?? "",
      priority: item.priority_id ?? null,
      colorIndex: item.color_index ?? null,
      link: item.url ?? "",
      additionalLinks: item.additional_links ?? [],
      imagePreview: item.image_url ?? "",
      currency: resolveCurrency(item.currency),
      hadLocalImage: false,
    }),
    [item],
  );
  const [name, setName] = useState(item.name ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price ?? "");
  const [priority, setPriority] = useState<string | null>(item.priority_id ?? null);
  const [colorIndex, setColorIndex] = useState<number | null>(item.color_index ?? null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [link, setLink] = useState(item.url ?? "");
  const [additionalLinks, setAdditionalLinks] = useState<ItemLink[]>(item.additional_links ?? []);
  const [imagePreview, setImagePreview] = useState(item.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState(resolveCurrency(item.currency));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [localImageNeedsReupload, setLocalImageNeedsReupload] = useState(false);
  const [restoredFields, setRestoredFields] = useState<RestoredEditItemFields>(
    EMPTY_RESTORED_EDIT_ITEM_FIELDS,
  );

  const { mutate, isPending } = useUpdateItem();
  const lastScrapedLinkRef = useRef(item.url?.trim() ?? "");
  const scrapeRequestIdRef = useRef(0);
  const imageObjectUrlRef = useRef<string | null>(null);

  const draftValue = useMemo<EditItemDraft>(
    () => ({
      name,
      description,
      price,
      priority,
      colorIndex,
      link,
      additionalLinks,
      imagePreview: imageFile ? "" : imagePreview,
      currency,
      hadLocalImage: Boolean(imageFile),
    }),
    [
      additionalLinks,
      currency,
      colorIndex,
      description,
      imageFile,
      imagePreview,
      link,
      name,
      price,
      priority,
    ],
  );

  const isMeaningfulDraft = useCallback(
    (draft: EditItemDraft) => {
      const additionalLinksChanged =
        JSON.stringify(draft.additionalLinks.filter((itemLink) => itemLink.url.trim())) !==
        JSON.stringify(initialDraft.additionalLinks);

      return (
        draft.name.trim() !== initialDraft.name.trim() ||
        draft.description.trim() !== initialDraft.description.trim() ||
        draft.price.trim() !== initialDraft.price.trim() ||
        draft.priority !== initialDraft.priority ||
        draft.colorIndex !== initialDraft.colorIndex ||
        draft.link.trim() !== initialDraft.link.trim() ||
        draft.currency !== initialDraft.currency ||
        draft.imagePreview !== initialDraft.imagePreview ||
        draft.hadLocalImage ||
        additionalLinksChanged
      );
    },
    [initialDraft],
  );

  const getRestoredFields = useCallback(
    (draft: EditItemDraft): RestoredEditItemFields => ({
      link: draft.link.trim() !== initialDraft.link.trim(),
      additionalLinks:
        JSON.stringify(draft.additionalLinks.filter((itemLink) => itemLink.url.trim())) !==
        JSON.stringify(initialDraft.additionalLinks),
      image: draft.imagePreview !== initialDraft.imagePreview || draft.hadLocalImage,
      name: draft.name.trim() !== initialDraft.name.trim(),
      description: draft.description.trim() !== initialDraft.description.trim(),
      price: draft.price.trim() !== initialDraft.price.trim(),
      currency: draft.currency !== initialDraft.currency,
      priority: draft.priority !== initialDraft.priority,
      colorIndex: draft.colorIndex !== initialDraft.colorIndex,
    }),
    [initialDraft],
  );

  const applyDraft = useCallback(
    (draft: EditItemDraft) => {
      setName(draft.name);
      setDescription(draft.description);
      setPrice(draft.price);
      setPriority(draft.priority);
      setColorIndex(draft.colorIndex);
      setColorPickerOpen(false);
      setLink(draft.link);
      setAdditionalLinks(draft.additionalLinks);
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
      setImageObjectUrl(null);
      setImageFile(null);
      setImagePreview(draft.imagePreview);
      setCurrency(draft.currency);
      setImageError(null);
      setLocalImageNeedsReupload(draft.hadLocalImage);
      setRestoredFields(getRestoredFields(draft));
    },
    [getRestoredFields, imageObjectUrl],
  );

  const { isDraftRestored, clearDraft } = useSessionDraft({
    userId: currentUserId,
    kind: "edit-item",
    scopeId: item.id,
    open,
    value: draftValue,
    onRestore: applyDraft,
    isMeaningful: isMeaningfulDraft,
  });

  const hasChanges = useMemo(() => {
    const initialName = item.name?.trim() ?? "";
    const initialDescription = item.description?.trim() ?? "";
    const initialPrice = item.price?.trim() ?? "";
    const initialLink = item.url?.trim() ?? "";
    const initialPriority = item.priority_id ?? null;
    const initialCurrency = resolveCurrency(item.currency);
    const initialImage = item.image_url ?? "";
    const initialAdditionalLinks = item.additional_links ?? [];

    const additionalLinksChanged =
      JSON.stringify(additionalLinks.filter((l) => l.url.trim())) !==
      JSON.stringify(initialAdditionalLinks);

    return (
      name.trim() !== initialName ||
      description.trim() !== initialDescription ||
      price.trim() !== initialPrice ||
      link.trim() !== initialLink ||
      priority !== initialPriority ||
      colorIndex !== (item.color_index ?? null) ||
      currency !== initialCurrency ||
      Boolean(imageFile) ||
      imagePreview !== initialImage ||
      additionalLinksChanged
    );
  }, [
    additionalLinks,
    colorIndex,
    currency,
    description,
    imageFile,
    imagePreview,
    item,
    link,
    name,
    price,
    priority,
  ]);

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  useEffect(() => {
    imageObjectUrlRef.current = imageObjectUrl;
  }, [imageObjectUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextImageError = validateImageUploadFile(file);
    if (nextImageError) {
      setImageError(nextImageError);
      e.target.value = "";
      return;
    }

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);

    setImageError(null);
    setImageFile(file);
    setImagePreview(objectUrl);
    setLocalImageNeedsReupload(false);
  }

  function restoreInitialState() {
    scrapeRequestIdRef.current += 1;
    lastScrapedLinkRef.current = initialDraft.link.trim();
    setName(initialDraft.name);
    setDescription(initialDraft.description);
    setPrice(initialDraft.price);
    setPriority(initialDraft.priority);
    setColorIndex(initialDraft.colorIndex);
    setColorPickerOpen(false);
    setLink(initialDraft.link);
    setAdditionalLinks(initialDraft.additionalLinks);
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl);
    }
    setImageObjectUrl(null);
    setImageFile(null);
    setImagePreview(initialDraft.imagePreview);
    setCurrency(initialDraft.currency);
    setError(null);
    setLoading(false);
    setImageError(null);
    setLocalImageNeedsReupload(false);
    setRestoredFields(EMPTY_RESTORED_EDIT_ITEM_FIELDS);
  }

  function handleDiscardDraft() {
    clearDraft();
    restoreInitialState();
  }

  function handleSubmit() {
    if (!name.trim() || isPending || !hasChanges) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const priorityValue = priority || null;

    // Filter out empty additional links
    const validAdditionalLinks = additionalLinks.filter((l) => l.url.trim());

    const updates: UpdateItemParams = {
      name: name.trim(),
      description: description.trim() || null,
      price: price.trim() || null,
      url: link.trim() || null,
      additional_links: validAdditionalLinks,
      priority_id: priorityValue,
      color_index: colorIndex,
      currency,
      ...(imageFile ? { image: imageFile } : { image_url: imagePreview || null }),
    };

    mutate(
      { id: item.id, updates },
      {
        onSuccess: () => {
          clearDraft();
          onClose();
        },
      },
    );
  }

  const handleScrape = useCallback(
    async (urlToScrape = link) => {
      const trimmedLink = urlToScrape.trim();
      if (!trimmedLink) return;

      const requestId = scrapeRequestIdRef.current + 1;
      scrapeRequestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/server/scrape-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedLink, source: "add-item" }),
        });

        const data = await response.json();
        if (requestId !== scrapeRequestIdRef.current) return;

        if (response.ok) {
          const product = {
            title: data?.title ?? null,
            description: data?.description ?? null,
            image: data?.image ?? null,
            price: data?.price ?? null,
            currency: data?.currency ?? null,
          };

          const isEmpty =
            !product.title && !product.description && !product.image && !product.price;

          if (isEmpty) {
            setError(
              t("Could not fetch product data", {
                $id: "item.modal.scrapeEmpty",
              }),
            );
            return;
          }

          if (product.title) setName(product.title);
          if (product.description) setDescription(product.description);
          if (product.price) setPrice(product.price);
          if (product.currency) setCurrency(resolveCurrency(product.currency));
          if (product.image) {
            if (imageObjectUrlRef.current) {
              URL.revokeObjectURL(imageObjectUrlRef.current);
            }
            setImageObjectUrl(null);
            setImageFile(null);
            setImagePreview(product.image);
          }
        } else {
          setError(data?.error || t("Error loading product", { $id: "item.modal.scrapeError" }));
        }
      } catch {
        if (requestId === scrapeRequestIdRef.current) {
          setError(
            t("Could not fetch product data", {
              $id: "item.modal.scrapeEmpty",
            }),
          );
        }
      } finally {
        if (requestId === scrapeRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [link, t],
  );

  useEffect(() => {
    const trimmedLink = link.trim();
    if (!open || !trimmedLink) {
      if (!trimmedLink) lastScrapedLinkRef.current = "";
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastScrapedLinkRef.current === trimmedLink) return;
      lastScrapedLinkRef.current = trimmedLink;
      void handleScrape(trimmedLink);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [handleScrape, link, open]);

  function handleClearLink() {
    scrapeRequestIdRef.current += 1;
    lastScrapedLinkRef.current = "";
    setLink("");
    setError(null);
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <Heading>{t("Edit Item", { $id: "item.modal.edit.title" })}</Heading>
          </div>
          {isDraftRestored && (
            <div className={styles.draftBanner}>
              <div className={styles.draftBannerMeta}>
                <DraftBadge label={t("Draft", { $id: "draft.badge" })} />
                <span>
                  {isDraftRestored
                    ? t("Draft restored for this item.", {
                        $id: "draft.editItem.restored",
                      })
                    : t("Draft is saved for this item.", {
                        $id: "draft.editItem.saved",
                      })}
                </span>
              </div>
              <button type="button" className={styles.draftAction} onClick={handleDiscardDraft}>
                {t("Discard", { $id: "draft.discard" })}
              </button>
            </div>
          )}
          {isDraftRestored && localImageNeedsReupload && (
            <p className={styles.draftNote}>
              {t("Local image needs to be added again.", {
                $id: "draft.localImageReupload",
              })}
            </p>
          )}
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && (restoredFields.link || restoredFields.additionalLinks) ? styles.draftField : ""}`.trim()}
        >
          <label>{t("Product link", { $id: "item.modal.productLink" })}</label>
          <div className={styles.urlRow}>
            <input
              type="url"
              placeholder={t("Paste a product URL", {
                $id: "item.modal.productUrlPlaceholder",
              })}
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={handleClearLink}
              disabled={!link.trim() && !loading}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
              ) : (
                t("Clear", { $id: "common.clear" })
              )}
            </Button>
          </div>

          {/* Additional links - Pro feature */}
          {canUseMultipleLinks && (
            <div className={styles.additionalLinks}>
              {additionalLinks.map((extraLink, index) => (
                <div key={index} className={styles.additionalLinkRow}>
                  <input
                    type="url"
                    placeholder={t("Additional link URL", {
                      $id: "item.modal.additionalLinkPlaceholder",
                    })}
                    value={extraLink.url}
                    onChange={(e) => {
                      const updated = [...additionalLinks];
                      updated[index] = {
                        ...updated[index],
                        url: e.target.value,
                      };
                      setAdditionalLinks(updated);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.removeLinkBtn}
                    onClick={() => {
                      setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
                    }}
                    aria-label={t("Remove link", {
                      $id: "item.modal.removeLinkAria",
                    })}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addLinkBtn}
                onClick={() => setAdditionalLinks([...additionalLinks, { url: "" }])}
              >
                <Plus size={14} />
                <span>{t("Add another link", { $id: "item.modal.addAnotherLink" })}</span>
              </button>
            </div>
          )}

          {!canUseMultipleLinks && SUBSCRIPTIONS_UI_ENABLED && (
            <button
              type="button"
              className={styles.proLinkHint}
              onClick={() => window.open("/subscription", "_blank")}
            >
              <Lock size={12} />
              <span>
                {t("Pro: Add multiple links", {
                  $id: "item.modal.proMultipleLinks",
                })}
              </span>
            </button>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.image ? styles.draftField : ""}`.trim()}
        >
          <div className={styles.labelRow}>
            <label>{t("Image", { $id: "item.modal.imageLabel" })}</label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label
              className={`${styles.dropArea} ${isDraftRestored && restoredFields.image ? styles.draftDropArea : ""}`.trim()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t("Preview", { $id: "item.modal.previewAlt" })}
                  className={styles.preview}
                />
              ) : (
                <span>
                  {t("Drop an image or click to upload", {
                    $id: "wishlist.modal.dropImage",
                  })}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </label>
          </div>
          <UploadErrorText message={imageError} />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.name ? styles.draftField : ""}`.trim()}
        >
          <label>{t("Name", { $id: "item.modal.nameLabel" })}</label>
          <input
            placeholder={t("e.g. Noise-cancelling headphones", {
              $id: "item.modal.namePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.description ? styles.draftField : ""}`.trim()}
        >
          <label>
            {t("Description (optional)", {
              $id: "wishlist.modal.descriptionLabel",
            })}
          </label>
          <textarea
            placeholder={t("Add details, size, color...", {
              $id: "item.modal.descriptionPlaceholder",
            })}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && (restoredFields.price || restoredFields.currency) ? styles.draftField : ""}`.trim()}
        >
          <label>{t("Price (optional)", { $id: "item.modal.priceLabel" })}</label>
          <div className={styles.priceRow}>
            <Select
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              aria-label={t("Currency", { $id: "item.modal.currencyAria" })}
              className={styles.selectWrap}
              triggerClassName={`${styles.selectField} ${isDraftRestored && restoredFields.currency ? styles.draftSelectField : ""}`.trim()}
            />
            <input
              type="text"
              placeholder={t("199", { $id: "item.modal.pricePlaceholder" })}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.priorityColorRow}>
          {canUsePriority && (
            <div
              className={`${styles.field} ${isDraftRestored && restoredFields.priority ? styles.draftField : ""}`.trim()}
            >
              <label>{t("Priority", { $id: "item.modal.priorityLabel" })}</label>
              <Select
                value={priority ?? ""}
                onChange={(v) => setPriority(v || null)}
                options={priorityOptions}
                ariaLabel={t("Priority", { $id: "item.modal.priorityLabel" })}
                triggerClassName={`${styles.selectField} ${isDraftRestored && restoredFields.priority ? styles.draftSelectField : ""}`.trim()}
                dropdownClassName={styles.prioritySelectDropdown}
                optionClassName={styles.prioritySelectOption}
                leadingClassName={styles.prioritySelectLeading}
              />
            </div>
          )}

          <div
            className={`${styles.field} ${styles.compactColorField}`}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setColorPickerOpen(false);
              }
            }}
          >
            <label>{t("Card Color", { $id: "item.modal.colorLabelShort" })}</label>
            <button
              type="button"
              className={styles.colorTrigger}
              style={
                {
                  "--selected-color":
                    colorIndex === null
                      ? "var(--color-border-light)"
                      : isStarCardColorIndex(colorIndex)
                        ? "var(--color-brand)"
                        : ITEM_COLORS[colorIndex]?.color,
                } as React.CSSProperties
              }
              onClick={() => setColorPickerOpen((value) => !value)}
              aria-expanded={colorPickerOpen}
              aria-haspopup="grid"
              aria-label={t("Card Color", {
                $id: "item.modal.colorLabelShort",
              })}
            >
              <span className={styles.colorTriggerSwatch}>
                {isStarCardColorIndex(colorIndex) && <Star size={12} fill="currentColor" />}
              </span>
            </button>

            {colorPickerOpen && (
              <div className={styles.colorPopover}>
                <button
                  type="button"
                  className={`${styles.colorSwatch} ${styles.colorSwatchNone} ${colorIndex === null ? styles.colorSwatchActive : ""}`}
                  onClick={() => {
                    setColorIndex(null);
                    setColorPickerOpen(false);
                  }}
                  title={t("No color", { $id: "item.modal.colorNone" })}
                />
                <button
                  type="button"
                  className={`${styles.colorSwatch} ${styles.colorSwatchStar} ${isStarCardColorIndex(colorIndex) ? styles.colorSwatchActive : ""}`}
                  onClick={() => {
                    setColorIndex(STAR_CARD_COLOR_INDEX);
                    setColorPickerOpen(false);
                  }}
                  title={t("Star", { $id: "item.modal.colorStar" })}
                >
                  <Star size={13} fill="currentColor" />
                </button>
                {ITEM_COLORS.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.colorSwatch} ${colorIndex === idx ? styles.colorSwatchActive : ""}`}
                    style={{ "--swatch-color": c.color } as React.CSSProperties}
                    onClick={() => {
                      setColorIndex(idx);
                      setColorPickerOpen(false);
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !hasChanges || isPending || Boolean(imageError)}
          >
            {isPending
              ? t("Saving...", { $id: "common.saving" })
              : t("Save Changes", { $id: "wishlist.modal.saveChanges" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
