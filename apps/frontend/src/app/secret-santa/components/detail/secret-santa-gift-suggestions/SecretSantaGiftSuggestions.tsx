"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Gift, Loader2, ShoppingCart } from "lucide-react";
import type { VisibleItem } from "@/api/types/secret-santa";
import { useGiftSuggestions } from "@/hooks/use-secret-santa";
import { useToggleItemReservationSecret, useToggleItemBoughtSecret } from "@/hooks/use-items";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { useCurrentUserId } from "@/hooks/use-user";
import { WishlistItemDetailModal } from "@/app/wishlist/[id]/components/wishlist-item-detail-modal/WishlistItemDetailModal";
import type { Item } from "@/types/item";
import styles from "./SecretSantaGiftSuggestions.module.scss";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";

type Props = {
  budget: number;
  currency?: string | null;
  receiverId?: string;
};

function toWishlistItem(item: VisibleItem): Item {
  return {
    id: item.id,
    wishlist_id: item.wishlist_id,
    name: item.name,
    description: item.description,
    price: item.price,
    priority_id: item.priority_id ?? null,
    priority_name: item.priority_name ?? null,
    color_index: item.color_index ?? null,
    image_url: item.image_url,
    url: item.url,
    created_at: item.created_at,
    status: item.status ?? 0,
    reserved_by: item.reserved_by,
    discount_price: item.discount_price,
    has_discount: item.has_discount ?? false,
    discount_end_date: item.discount_end_date,
    currency: item.currency,
    additional_links: item.additional_links ?? [],
  };
}

export function SecretSantaGiftSuggestions({ budget, currency, receiverId }: Props) {
  const t = useGT();
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
        <span>
          {t("Gift ideas up to {budget}", {
            budget: formatPrice(budget, currency),
            $id: "secretSanta.gifts.header",
          })}
        </span>
      </div>

      <p className={styles.description}>
        {t("Items from your receiver's wishlists that fit the event budget.", {
          $id: "secretSanta.gifts.description",
        })}
      </p>

      {isLoading ? (
        <div className={styles.placeholder}>
          <Loader2 size={16} className={styles.spinner} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.placeholder}>
          {t("No matching items found in their wishlists.", {
            $id: "secretSanta.gifts.empty",
          })}
        </div>
      ) : (
        <div className={styles.scrollArea}>
          {items.map((item) => {
            const reservedByMe = !!currentUserId && item.reserved_by === currentUserId;
            const isPurchased = item.status === 2;
            const isReserved = item.status === 1 || !!item.reserved_by;
            const reserveStatusLabel = isPurchased
              ? reservedByMe
                ? t("Purchased by you", {
                    $id: "secretSanta.gifts.status.purchasedByYou",
                  })
                : t("Purchased", {
                    $id: "secretSanta.gifts.status.purchased",
                  })
              : isReserved
                ? reservedByMe
                  ? t("Reserved by you", {
                      $id: "secretSanta.gifts.status.reservedByYou",
                    })
                  : t("Reserved", {
                      $id: "secretSanta.gifts.status.reserved",
                    })
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
                    <div className={styles.itemImagePlaceholder}>
                      {t("No image", {
                        $id: "secretSanta.gifts.noImage",
                      })}
                    </div>
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
