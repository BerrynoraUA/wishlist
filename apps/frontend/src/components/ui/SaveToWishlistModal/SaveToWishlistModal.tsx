"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Gift, Search, ShoppingBag } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { useCreateItem } from "@/hooks/use-items";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { normalizeSearchQuery } from "@/lib/helpers/search";
import styles from "./SaveToWishlistModal.module.scss";
import type { ItemLink } from "@/types/item";

export type SaveItemData = {
  name: string;
  description?: string | null;
  price?: string | null;
  image_url?: string | null;
  url?: string | null;
  priority?: number | null;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: SaveItemData;
};

export function SaveToWishlistModal({ open, onClose, item }: Props) {
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: wishlists = [], isLoading } = useMyWishlists({
    take: 100,
    search: debouncedSearch,
  });
  const createItem = useCreateItem();

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(normalizeSearchQuery(search));
    }, 220);

    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!selectedWishlistId) return;
    if (wishlists.some((wishlist) => wishlist.id === selectedWishlistId))
      return;
    setSelectedWishlistId(null);
  }, [wishlists, selectedWishlistId]);

  const handleSave = async () => {
    if (!selectedWishlistId) return;

    try {
      await createItem.mutateAsync({
        wishlist_id: selectedWishlistId,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        url: item.url,
        priority: item.priority,
        discount_price: item.discount_price,
        has_discount: item.has_discount,
        discount_end_date: item.discount_end_date,
        currency: item.currency,
        additional_links: item.additional_links,
      });
      setShowSuccess(true);
    } catch (err) {
      console.error("Failed to save item to wishlist", err);
    }
  };

  const handleClose = () => {
    setSelectedWishlistId(null);
    setSearch("");
    setDebouncedSearch("");
    setShowSuccess(false);
    onClose();
  };

  if (showSuccess) {
    const savedTo = wishlists.find((w) => w.id === selectedWishlistId);

    return (
      <Modal open={open} onClose={handleClose}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>
            <Check size={24} />
          </div>
          <Heading level={3}>Saved!</Heading>
          <Text variant="subtitle" tone="secondary">
            <strong>{item.name}</strong> has been added to{" "}
            <strong>{savedTo?.title ?? "your wishlist"}</strong>.
          </Text>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className={styles.container}>
        <div className={styles.scrollArea}>
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              <Bookmark size={24} />
            </div>
            <Heading level={3}>Save to wishlist</Heading>
            <Text
              variant="subtitle"
              tone="secondary"
              className={styles.subtitle}
            >
              Choose which wishlist you want to add this item to
            </Text>
          </div>

          <div className={styles.itemPreview}>
            {item.image_url ? (
              <img
                className={styles.itemImage}
                src={item.image_url}
                alt={item.name}
              />
            ) : (
              <div className={styles.itemImagePlaceholder}>
                <ShoppingBag size={20} />
              </div>
            )}
            <div className={styles.itemInfo}>
              <p className={styles.itemName}>{item.name}</p>
              {item.price && <p className={styles.itemPrice}>{item.price}</p>}
            </div>
          </div>

          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search wishlists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.wishlistList}>
            {isLoading && (
              <div className={styles.emptyState}>
                <div style={{ display: "grid", gap: 8, width: "100%" }}>
                  {[0, 1, 2].map((i) => (
                    <Skeleton
                      key={i}
                      width="100%"
                      height={44}
                      borderRadius={12}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && wishlists.length === 0 && (
              <div className={styles.emptyState}>
                {debouncedSearch
                  ? "No wishlists found"
                  : "You don't have any wishlists yet"}
              </div>
            )}

            {wishlists.map((wishlist) => {
              const isSelected = selectedWishlistId === wishlist.id;

              return (
                <button
                  key={wishlist.id}
                  type="button"
                  className={`${styles.wishlistOption} ${isSelected ? styles.wishlistOptionSelected : ""}`}
                  onClick={() => setSelectedWishlistId(wishlist.id)}
                >
                  {wishlist.image_url ? (
                    <img
                      className={styles.wishlistCover}
                      src={wishlist.image_url}
                      alt={wishlist.title}
                    />
                  ) : (
                    <div className={styles.wishlistCoverPlaceholder}>
                      <Gift size={18} />
                    </div>
                  )}
                  <div className={styles.wishlistMeta}>
                    <div className={styles.wishlistTitle}>{wishlist.title}</div>
                    <div className={styles.wishlistCount}>
                      {wishlist.items_count}{" "}
                      {wishlist.items_count === 1 ? "item" : "items"}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={18} className={styles.selectedCheck} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedWishlistId || createItem.isPending}
          >
            {createItem.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
