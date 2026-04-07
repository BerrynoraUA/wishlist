"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useCreateItem } from "@/hooks/use-items";
import { useSettings } from "@/hooks/use-settings";
import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import styles from "./CreateItemModal.module.scss";

import type { CreateItemParams } from "@/api/types/item";

type Props = {
  open: boolean;
  onClose: () => void;
  wishlistId: string;
};

type PriorityOption = "Low" | "Medium" | "High" | "None";

const priorityToValue: Record<Exclude<PriorityOption, "None">, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const supportedCurrencyCodes = new Set(
  SUPPORTED_CURRENCIES.map((currency) => currency.code),
);

function resolveCurrency(value?: string | null) {
  const normalized = normalizeCurrencyCode(value);
  return supportedCurrencyCodes.has(normalized) ? normalized : "USD";
}

export function CreateItemModal({ open, onClose, wishlistId }: Props) {
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState<PriorityOption>("None");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountPrice, setDiscountPrice] = useState<string | null>(null);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountEndDate, setDiscountEndDate] = useState<string | null>(null);
  const { data: settings } = useSettings();
  const preferredCurrency = resolveCurrency(settings?.display_currency);
  const [currency, setCurrency] = useState(preferredCurrency);

  const { mutate, isPending } = useCreateItem();

  useEffect(() => {
    if (!open) {
      resetForm(preferredCurrency);
    }
  }, [open, preferredCurrency]);

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
    setName("");
    setDescription("");
    setPrice("");
    setPriority("None");
    setImagePreview("");
    setImageFile(null);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
    setError(null);
    setDiscountPrice(null);
    setHasDiscount(false);
    setDiscountEndDate(null);
    setCurrency(nextCurrency);
  }

  function handleSubmit() {
    if (!name.trim() || !wishlistId || isPending) return;

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
      image: imageFile,
      image_url: imageUrlToSave,
      discount_price: discountPrice,
      has_discount: hasDiscount,
      discount_end_date: discountEndDate,
      currency,
    };

    mutate(payload, {
      onSuccess: () => {
        resetForm();
        onClose();
      },
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);

    setImageFile(file);
    setImagePreview(objectUrl);
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
          setError("Не вдалося отримати дані");
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
        setError(data?.error || "Помилка при завантаженні");
      }
    } catch (err) {
      console.error("Scraping failed:", err);
      setError("Не вдалося отримати дані");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Create Item</h2>
          <p>Add a product to this wishlist.</p>
        </div>

        <div className={styles.field}>
          <label>Product link</label>
          <div className={styles.urlRow}>
            <input
              type="url"
              placeholder="Paste a product URL"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={handleScrape}
              disabled={!link.trim() || loading}
            >
              {loading ? "Loading..." : "Search"}
            </Button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.field}>
          <label>Image (drag & drop or click)</label>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className={styles.preview}
                />
              ) : (
                <>
                  <span>Drop an image or click to upload</span>
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
        </div>

        <div className={styles.field}>
          <label>Name</label>
          <input
            placeholder="e.g. Noise-cancelling headphones"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Description (optional)</label>
          <textarea
            placeholder="Add details, size, color..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Price (optional)</label>
          <div className={styles.priceRow}>
            <div className={styles.selectWrap}>
              <select
                className={styles.selectField}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
              >
                {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
                  <option
                    key={supportedCurrency.code}
                    value={supportedCurrency.code}
                  >
                    {supportedCurrency.symbol} {supportedCurrency.code}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.selectChevron} size={16} />
            </div>
            <input
              type="text"
              placeholder="199"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Priority</label>
          <div className={styles.selectWrap}>
            <select
              className={styles.selectField}
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityOption)}
            >
              <option value="None">No priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <ChevronDown className={styles.selectChevron} size={16} />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
