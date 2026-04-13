"use client";

import { useEffect, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { useUpdateItem } from "@/hooks/use-items";
import { useSubscription } from "@/hooks/use-subscription";
import { Item } from "@/types/item";
import type { UpdateItemParams } from "@/api/types/item";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { validateImageUploadFile } from "@/lib/image-upload";
import styles from "./CreateItemModal.module.scss";

type PriorityOption = "Low" | "Medium" | "High" | "None";

const priorityToValue: Record<Exclude<PriorityOption, "None">, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const valueToPriority: Record<number, PriorityOption> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: Item;
};

export function EditItemModal({ open, onClose, item }: Props) {
  if (!open) return null;

  return <EditItemForm open={open} item={item} onClose={onClose} />;
}

function EditItemForm({ open, item, onClose }: { open: boolean; item: Item; onClose: () => void }) {
  const t = useGT();
  const { isPro } = useSubscription();
  const canUsePriority = !SUBSCRIPTIONS_UI_ENABLED || isPro;
  const [name, setName] = useState(item.name ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price ?? "");
  const [priority, setPriority] = useState<PriorityOption>(
    item.priority ? (valueToPriority[item.priority] ?? "None") : "None",
  );
  const [link, setLink] = useState(item.url ?? "");
  const [imagePreview, setImagePreview] = useState(item.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState(item.currency ?? "USD");
  const [imageError, setImageError] = useState<string | null>(null);

  const { mutate, isPending } = useUpdateItem();

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
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
  }

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const priorityValue = priority === "None" ? null : priorityToValue[priority];

    const updates: UpdateItemParams = {
      name: name.trim(),
      description: description.trim() || null,
      price: price.trim() || null,
      url: link.trim() || null,
      priority: priorityValue,
      currency,
      ...(imageFile ? { image: imageFile } : { image_url: imagePreview || null }),
    };

    mutate({ id: item.id, updates }, { onSuccess: () => onClose() });
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>{t("Edit Item", { $id: "item.modal.edit.title" })}</h2>
        </div>

        <div className={styles.field}>
          <label>{t("Product link", { $id: "item.modal.productLink" })}</label>
          <input
            type="url"
            placeholder={t("Paste a product URL", {
              $id: "item.modal.productUrlPlaceholder",
            })}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label>{t("Image", { $id: "item.modal.imageLabel" })}</label>
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
          <label>{t("Price (optional)", { $id: "item.modal.priceLabel" })}</label>
          <div className={styles.priceRow}>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label={t("Currency", { $id: "item.modal.currencyAria" })}
            >
              <option value="USD">{t("$ USD", { $id: "currency.usd" })}</option>
              <option value="EUR">{t("€ EUR", { $id: "currency.eur" })}</option>
              <option value="GBP">{t("£ GBP", { $id: "currency.gbp" })}</option>
              <option value="UAH">{t("₴ UAH", { $id: "currency.uah" })}</option>
              <option value="PLN">{t("zł PLN", { $id: "currency.pln" })}</option>
              <option value="JPY">{t("¥ JPY", { $id: "currency.jpy" })}</option>
              <option value="CAD">{t("CA$ CAD", { $id: "currency.cad" })}</option>
              <option value="AUD">{t("A$ AUD", { $id: "currency.aud" })}</option>
              <option value="CHF">{t("CHF", { $id: "currency.chf" })}</option>
            </select>
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
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityOption)}
            >
              <option value="None">{t("No priority", { $id: "item.modal.priorityNone" })}</option>
              <option value="Low">{t("Low", { $id: "item.priority.low" })}</option>
              <option value="Medium">{t("Medium", { $id: "item.priority.medium" })}</option>
              <option value="High">{t("High", { $id: "item.priority.high" })}</option>
            </select>
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
              ? t("Saving...", { $id: "common.saving" })
              : t("Save Changes", { $id: "wishlist.modal.saveChanges" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
