"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useUpdateItem } from "@/hooks/use-items";
import { useSubscription } from "@/hooks/use-subscription";
import { Item } from "@/types/item";
import type { UpdateItemParams } from "@/api/types/item";
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

function EditItemForm({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Item;
  onClose: () => void;
}) {
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

  const { mutate, isPending } = useUpdateItem();
  const { isPro } = useSubscription();

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);

    setImageFile(file);
    setImagePreview(objectUrl);
  }

  function handleSubmit() {
    if (!name.trim() || isPending) return;

    const priorityValue = priority === "None" ? null : priorityToValue[priority];

    const updates: UpdateItemParams = {
      name: name.trim(),
      description: description.trim() || null,
      price: price.trim() || null,
      url: link.trim() || null,
      ...(imageFile
        ? { image: imageFile }
        : { image_url: imagePreview || null }),
    };

    // Priority is a Pro-only feature.
    // For non-Pro users we always send null as requested.
    if (!isPro) {
      updates.priority = null;
    } else {
      updates.priority = priorityValue;
    }

    mutate({ id: item.id, updates }, { onSuccess: () => onClose() });
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Edit Item</h2>
        </div>

        <div className={styles.field}>
          <label>Product link</label>
          <input
            type="url"
            placeholder="Paste a product URL"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Image</label>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className={styles.preview}
                />
              ) : (
                <span>Drop an image or click to upload</span>
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
          <input
            type="text"
            placeholder="$199"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {isPro && (
          <div className={styles.field}>
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityOption)}
            >
              <option value="None">No priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
