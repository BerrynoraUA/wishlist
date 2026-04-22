"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Loader2, Plus, X, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { Heading, Text } from "@/components/ui/Typography";
import { Select } from "@/components/ui/Select/Select";
import { useCurrentUserId } from "@/hooks/use-user";
import { useCreateItem } from "@/hooks/use-items";
import { useSettings } from "@/hooks/use-settings";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { useSubscription } from "@/hooks/use-subscription";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { validateImageUploadFile } from "@/lib/image-upload";
import {
  getCompactCurrencyOptions,
  getPriorityOptions,
  priorityToValue,
  resolveCurrency,
  type ItemPriorityOption,
} from "@/lib/helpers/form-select-options";
import styles from "./CreateItemModal.module.scss";

import type { CreateItemParams } from "@/api/types/item";
import type { ItemLink } from "@/types/item";

type Props = {
  open: boolean;
  onClose: () => void;
  wishlistId: string;
};

type CreateItemDraft = {
  link: string;
  additionalLinks: ItemLink[];
  name: string;
  description: string;
  price: string;
  priority: ItemPriorityOption;
  imagePreview: string;
  discountPrice: string | null;
  hasDiscount: boolean;
  discountEndDate: string | null;
  currency: string;
  hadLocalImage: boolean;
};

export function CreateItemModal({ open, onClose, wishlistId }: Props) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { isPro } = useSubscription();
  const canUsePriority = !SUBSCRIPTIONS_UI_ENABLED || isPro;
  const canUseMultipleLinks = !SUBSCRIPTIONS_UI_ENABLED || isPro;
  const [link, setLink] = useState("");
  const [additionalLinks, setAdditionalLinks] = useState<ItemLink[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState<ItemPriorityOption>("None");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [discountPrice, setDiscountPrice] = useState<string | null>(null);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountEndDate, setDiscountEndDate] = useState<string | null>(null);
  const [localImageNeedsReupload, setLocalImageNeedsReupload] = useState(false);
  const { data: settings } = useSettings();
  const preferredCurrency = resolveCurrency(settings?.display_currency);
  const [currency, setCurrency] = useState(preferredCurrency);
  const currencyOptions = getCompactCurrencyOptions();
  const priorityOptions = getPriorityOptions(t);

  const { mutate, isPending } = useCreateItem();

  const draftValue = useMemo<CreateItemDraft>(
    () => ({
      link,
      additionalLinks,
      name,
      description,
      price,
      priority,
      imagePreview: imageFile ? "" : imagePreview,
      discountPrice,
      hasDiscount,
      discountEndDate,
      currency,
      hadLocalImage: Boolean(imageFile),
    }),
    [
      additionalLinks,
      currency,
      description,
      discountEndDate,
      discountPrice,
      hasDiscount,
      imageFile,
      imagePreview,
      link,
      name,
      price,
      priority,
    ],
  );

  const isMeaningfulDraft = useCallback((draft: CreateItemDraft) => {
    return Boolean(
      draft.link.trim() ||
      draft.additionalLinks.some((itemLink) => itemLink.url.trim()) ||
      draft.name.trim() ||
      draft.description.trim() ||
      draft.price.trim() ||
      draft.priority !== "None" ||
      draft.imagePreview ||
      draft.discountPrice ||
      draft.hasDiscount ||
      draft.discountEndDate,
    );
  }, []);

  const applyDraft = useCallback(
    (draft: CreateItemDraft) => {
      setLink(draft.link);
      setAdditionalLinks(draft.additionalLinks);
      setName(draft.name);
      setDescription(draft.description);
      setPrice(draft.price);
      setPriority(draft.priority);
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
      setImageObjectUrl(null);
      setImageFile(null);
      setImagePreview(draft.imagePreview);
      setError(null);
      setImageError(null);
      setDiscountPrice(draft.discountPrice);
      setHasDiscount(draft.hasDiscount);
      setDiscountEndDate(draft.discountEndDate);
      setCurrency(draft.currency || preferredCurrency);
      setLocalImageNeedsReupload(draft.hadLocalImage);
    },
    [imageObjectUrl, preferredCurrency],
  );

  const { isDraftRestored, clearDraft } = useSessionDraft({
    userId: currentUserId,
    kind: "create-item",
    scopeId: wishlistId,
    open,
    value: draftValue,
    onRestore: applyDraft,
    isMeaningful: isMeaningfulDraft,
  });

  useEffect(() => {
    if (open && !link && !name && !description && !price && !imagePreview) {
      setCurrency(preferredCurrency);
    }
  }, [open, preferredCurrency, link, name, description, price, imagePreview]);

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  function resetForm(nextCurrency = preferredCurrency) {
    setLink("");
    setAdditionalLinks([]);
    setName("");
    setDescription("");
    setPrice("");
    setPriority("None");
    setImagePreview("");
    setImageFile(null);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
    setError(null);
    setImageError(null);
    setDiscountPrice(null);
    setHasDiscount(false);
    setDiscountEndDate(null);
    setLocalImageNeedsReupload(false);
    setCurrency(nextCurrency);
  }

  function handleDiscardDraft() {
    clearDraft();
    resetForm(preferredCurrency);
  }

  function handleSubmit() {
    if (!name.trim() || !wishlistId || isPending) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    const priorityValue =
      priority === "None" ? null : priorityToValue[priority];

    const payload: CreateItemParams = {
      wishlist_id: wishlistId,
      name: name.trim(),
      description: description.trim() || null,
      price: price.trim() || null,
      priority: priorityValue,
      url: link.trim() || null, // original link user pasted
      additional_links: additionalLinks.filter((l) => l.url.trim()),
      image: imageFile,
      image_url: imageUrlToSave,
      discount_price: discountPrice,
      has_discount: hasDiscount,
      discount_end_date: discountEndDate,
      currency,
    };

    mutate(payload, {
      onSuccess: () => {
        clearDraft();
        resetForm();
        onClose();
      },
    });
  }

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

  async function handleScrape() {
    if (!link.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/server/scrape-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        const product = {
          title: data?.title ?? null,
          description: data?.description ?? null,
          image: data?.image ?? null,
          price: data?.price ?? null,
          discount_price: data?.discount_price ?? null,
          has_discount: data?.has_discount ?? false,
          discount_end_date: data?.discount_end_date ?? null,
          currency: data?.currency ?? null,
        };

        const isEmpty =
          !product.title &&
          !product.description &&
          !product.image &&
          !product.price;

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
        setDiscountPrice(product.discount_price);
        setHasDiscount(product.has_discount);
        setDiscountEndDate(product.discount_end_date);
        if (product.image) {
          if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
          setImageObjectUrl(null);
          setImageFile(null);
          setImagePreview(product.image);
        }
      } else {
        setError(
          data?.error ||
            t("Error loading product", { $id: "item.modal.scrapeError" }),
        );
      }
    } catch {
      setError(
        t("Could not fetch product data", {
          $id: "item.modal.scrapeEmpty",
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <Heading>{t("Create Item", { $id: "item.modal.create.title" })}</Heading>
            <Text variant="caption" tone="muted">
              {t("Add a product to this wishlist.", {
                $id: "item.modal.create.subtitle",
              })}
            </Text>
          </div>
          {isDraftRestored && (
            <div className={styles.draftBanner}>
              <div className={styles.draftBannerMeta}>
                <DraftBadge label={t("Draft", { $id: "draft.badge" })} />
                <span>
                  {isDraftRestored
                    ? t("Draft restored for this item.", {
                        $id: "draft.createItem.restored",
                      })
                    : t("Draft is saved for this item.", {
                        $id: "draft.createItem.saved",
                      })}
                </span>
              </div>
              <button
                type="button"
                className={styles.draftAction}
                onClick={handleDiscardDraft}
              >
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

        <div className={styles.field}>
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
              onClick={handleScrape}
              disabled={!link.trim() || loading}
            >
              {loading ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
              ) : (
                t("Search", { $id: "item.modal.searchProduct" })
              )}
            </Button>
          </div>

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
                      setAdditionalLinks(
                        additionalLinks.filter((_, i) => i !== index),
                      );
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
                onClick={() =>
                  setAdditionalLinks([...additionalLinks, { url: "" }])
                }
              >
                <Plus size={14} />
                <span>
                  {t("Add another link", { $id: "item.modal.addAnotherLink" })}
                </span>
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

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label>
              {t("Image (drag & drop or click)", {
                $id: "item.modal.create.imageLabel",
              })}
            </label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t("Preview", { $id: "item.modal.previewAlt" })}
                  className={styles.preview}
                />
              ) : (
                <>
                  <span>
                    {t("Drop an image or click to upload", {
                      $id: "wishlist.modal.dropImage",
                    })}
                  </span>
                </>
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

        <div className={styles.field}>
          <label>{t("Name", { $id: "item.modal.nameLabel" })}</label>
          <input
            placeholder={t("e.g. Noise-cancelling headphones", {
              $id: "item.modal.namePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
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

        <div className={styles.field}>
          <label>
            {t("Price (optional)", { $id: "item.modal.priceLabel" })}
          </label>
          <div className={styles.priceRow}>
            <Select
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              ariaLabel={t("Currency", { $id: "item.modal.currencyAria" })}
              className={styles.selectWrap}
              triggerClassName={styles.selectField}
            />
            <input
              type="text"
              placeholder={t("199", { $id: "item.modal.pricePlaceholder" })}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {canUsePriority && (
          <div className={styles.field}>
            <label>{t("Priority", { $id: "item.modal.priorityLabel" })}</label>
            <Select
              value={priority}
              onChange={setPriority}
              options={priorityOptions}
              ariaLabel={t("Priority", { $id: "item.modal.priorityLabel" })}
              triggerClassName={styles.selectField}
            />
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending || Boolean(imageError)}
          >
            {isPending
              ? t("Creating...", { $id: "item.modal.creating" })
              : t("Create Item", { $id: "item.modal.create.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
