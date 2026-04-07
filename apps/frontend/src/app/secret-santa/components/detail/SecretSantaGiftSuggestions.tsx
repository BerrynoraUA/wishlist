"use client";

import { useState } from "react";
import { Gift, ShoppingCart } from "lucide-react";
import type { VisibleItem } from "@/api/types/secret-santa";
import { useGiftSuggestions } from "@/hooks/use-secret-santa";
import {
  useToggleItemReservationSecret,
  useToggleItemBoughtSecret,
} from "@/hooks/use-items";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { useCurrentUserId } from "@/hooks/use-user";
import { WishlistItemDetailModal } from "@/app/wishlist/components/WishlistItemDetailModal";
import type { Item } from "@/types/item";
import styles from "./SecretSantaGiftSuggestions.module.scss";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";

type Props = {
  budget: number;
  receiverId?: string;
};

function toWishlistItem(item: VisibleItem): Item {
  return {
    id: item.id,
    wishlist_id: item.wishlist_id,
    name: item.name,
    description: item.description,
    price: item.price,
    priority: item.priority,
    image_url: item.image_url,
    url: item.url,
    created_at: item.created_at,
    status: item.status ?? 0,
    reserved_by: item.reserved_by,
    discount_price: item.discount_price,
    has_discount: item.has_discount ?? false,
    discount_end_date: item.discount_end_date,
    currency: item.currency,
  };
}

export function SecretSantaGiftSuggestions({ budget, receiverId }: Props) {
  const { data, isLoading } = useGiftSuggestions(receiverId, budget);
  const toggleReserve = useToggleItemReservationSecret();
  const toggleBought = useToggleItemBoughtSecret();
  const { formatPrice } = useCurrencyFormatter();
  const { data: currentUserId = "" } = useCurrentUserId();
  const [selectedItem, setSelectedItem] = useState<VisibleItem | null>(null);

  const items = data?.items ?? [];

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <Gift size={16} />
        <span>Gift ideas up to {budget}$</span>
      </div>

      <p className={styles.description}>
        Items from your receiver&apos;s wishlists that fit the event budget.
      </p>

      {isLoading ? (
        <div className={styles.placeholder}>Loading suggestions…</div>
      ) : items.length === 0 ? (
        <div className={styles.placeholder}>
          No matching items found in their wishlists.
        </div>
      ) : (
        <div className={styles.scrollArea}>
          {items.map((item) => {
            const reservedByMe =
              !!currentUserId && item.reserved_by === currentUserId;
            const isPurchased = item.status === 2;
            const isReserved = item.status === 1 || !!item.reserved_by;
            const reserveStatusLabel = isPurchased
              ? reservedByMe
                ? "Purchased by you"
                : "Purchased"
              : isReserved
                ? reservedByMe
                  ? "Reserved by you"
                  : "Reserved"
                : null;

            return (
              <button
                key={item.id}
                className={`${styles.itemCard} ${isReserved ? styles.itemCardReserved : ""}`}
                onClick={() => setSelectedItem(item)}
                type="button"
              >
                <div className={styles.itemImage}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>No image</div>
                  )}

                  {reserveStatusLabel && (
                    <div
                      className={`${styles.statusBadge} ${isPurchased ? styles.statusBadgePurchased : ""}`}
                    >
                      {isPurchased ? (
                        <ShoppingCart size={13} />
                      ) : (
                        <ReservationLockIcon isReserved={true} size={13} />
                      )}
                      <span>{reserveStatusLabel}</span>
                    </div>
                  )}
                </div>

                <div className={styles.itemInfo}>
                  <strong>{item.name}</strong>
                  {item.effective_price != null && (
                    <span className={styles.itemPrice}>
                      {formatPrice(item.effective_price, item.currency)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <WishlistItemDetailModal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={toWishlistItem(selectedItem)}
          onToggleReserve={(id) => toggleReserve.mutate(id)}
          onToggleBought={(id) => toggleBought.mutate(id)}
        />
      )}
    </section>
  );
}
