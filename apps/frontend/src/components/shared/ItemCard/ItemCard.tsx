"use client";

import React from "react";
import { useGT } from "gt-next";
import styles from "./ItemCard.module.scss";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { ItemCardBase } from "@/components/shared/ItemCardBase/ItemCardBase";
import {
  buildReservationActionLabel,
  buildReservationStatusLabel,
  buildPurchaseActionLabel,
  getSalePercentOff,
  isDiscountActive,
} from "@/lib/helpers/item-card";
import { ALL_PRIORITIES } from "@/lib/priorities";
import { PRIORITY_ICONS } from "@/lib/priority-icons";
import { isStarCardColorIndex, ITEM_COLORS } from "@/lib/item-colors";
import type { LucideIcon } from "lucide-react";
import type { ItemCardProps } from "./types";
import { CardImage } from "./components/CardImage";
import { CardBadges } from "./components/CardBadges";
import { CardQuickActions } from "./components/CardQuickActions";
import { CardInfo } from "./components/CardInfo";
import { cn } from "./utils";

const VARIANT_CLASS: Record<string, string | undefined> = {
  discover: styles.discover,
  reserved: styles.reservedCard,
  wishlist: styles.wishlist,
};

export function ItemCard({
  id,
  name,
  image,
  price,
  store,
  url,
  shareUrl,
  description,
  priority,
  discountPrice,
  discountEndDate,
  currency,
  status,
  isReserved,
  reservedBy,
  reservedByName,
  colorIndex,
  variant = "discover",
  showDiscountBadge = false,
  isOwner = false,
  reservedByCurrentUser = false,
  mode,
  onToggleReserve,
  onToggleBought,
  onDelete,
  onEdit,
  autoOpen,
  onAutoOpenHandled,
  renderDetailModal,
}: ItemCardProps) {
  const t = useGT();
  const { formatPrice } = useCurrencyFormatter();

  const priorityMeta = priority ? ALL_PRIORITIES.find((p) => p.name === priority) : null;
  const priorityColor = priorityMeta?.color ?? null;
  const priorityDisplay = priority || null;
  const PriorityIcon: LucideIcon | null = priorityMeta
    ? (PRIORITY_ICONS[priorityMeta.id] ?? null)
    : null;

  const accentColor =
    colorIndex !== null &&
    colorIndex !== undefined &&
    colorIndex >= 0 &&
    colorIndex < ITEM_COLORS.length
      ? ITEM_COLORS[colorIndex].color
      : null;
  const hasStarAccent = isStarCardColorIndex(colorIndex);

  const formattedPrice = formatPrice(price, currency);
  const showActiveDiscount =
    showDiscountBadge && isDiscountActive(discountPrice != null, discountEndDate);
  const salePercentOff = getSalePercentOff(price, discountPrice, showActiveDiscount);
  const isWishlist = variant === "wishlist";
  const isPurchasedMode = mode === "purchased";

  return (
    <ItemCardBase
      itemId={id}
      itemName={name}
      status={status}
      isReserved={isReserved}
      reservedBy={reservedBy}
      isOwner={isOwner}
      reservedByCurrentUser={reservedByCurrentUser}
      autoOpen={autoOpen}
      onAutoOpenHandled={onAutoOpenHandled}
      onToggleReserve={onToggleReserve}
      onToggleBought={onToggleBought}
      renderDetailModal={renderDetailModal}
    >
      {({
        isPurchased,
        isReserved: isReservedState,
        reservedByMe,
        canToggleReservation,
        canToggleBought,
        openDetail,
        handleReserveClick,
        handleBoughtClick,
      }) => {
        const statusLabel = buildReservationStatusLabel(
          { isPurchased, isReserved: isReservedState, reservedByMe },
          reservedByName,
          {
            purchasedByYou: () => t("Purchased by you", { $id: "itemCard.purchasedByYou" }),
            purchased: () => t("Purchased", { $id: "itemCard.purchased" }),
            purchasedByName: (n) =>
              t("Purchased by {name}", {
                name: n,
                $id: "itemCard.purchasedByName",
              }),
            reservedByYou: () => t("Reserved by you", { $id: "itemCard.reservedByYou" }),
            reserved: () => t("Reserved", { $id: "itemCard.reserved" }),
            reservedByName: (n) =>
              t("Reserved by {name}", {
                name: n,
                $id: "itemCard.reservedByName",
              }),
          },
        );

        const reserveBtnLabel = buildReservationActionLabel(
          {
            isPurchased,
            isReserved: isReservedState,
            reservedByMe,
          },
          {
            purchased: () => t("Purchased", { $id: "itemCard.purchasedBtn" }),
            reservedByYou: () => t("Reserved by you", { $id: "itemCard.reservedByYouBtn" }),
            reserved: () => t("Reserved", { $id: "itemCard.reservedBtn" }),
            available: () => t("Reserve this gift", { $id: "itemCard.reserveGift" }),
          },
        );
        const boughtActionLabel = buildPurchaseActionLabel(isPurchased, {
          purchased: () => t("Mark as not purchased", { $id: "itemCard.unpurchase" }),
          available: () => t("Mark as purchased", { $id: "itemCard.purchase" }),
        });

        // Gray out reserved/purchased items so they read as "taken" at a
        // glance, while the badge itself stays fully visible.
        const isTaken = !isOwner && !!statusLabel;

        return (
          <div
            className={cn(
              styles.card,
              VARIANT_CLASS[variant],
              isPurchasedMode && styles.cardPurchased,
              accentColor && styles.cardColored,
              hasStarAccent && styles.cardStarAccent,
              isTaken && styles.cardReserved,
            )}
            style={
              accentColor
                ? ({
                    "--card-accent-color": accentColor,
                  } as React.CSSProperties)
                : undefined
            }
            onClick={openDetail}
          >
            <div className={styles.imageWrapper}>
              <CardImage image={image} name={name} isWishlist={isWishlist} />

              {isTaken && (
                <div className={styles.reservedStamp} aria-hidden="true">
                  <span>
                    {isPurchased
                      ? t("Purchased", { $id: "itemCard.purchasedStamp" })
                      : t("Reserved", { $id: "itemCard.reservedStamp" })}
                  </span>
                </div>
              )}

              <CardBadges
                variant={variant}
                isOwner={isOwner}
                statusLabel={statusLabel}
                isPurchased={isPurchased}
                salePercentOff={salePercentOff}
                priorityColor={priorityColor}
                priorityDisplay={priorityDisplay}
                PriorityIcon={PriorityIcon}
              />

              <CardQuickActions
                id={id}
                name={name}
                description={description}
                image={image}
                price={price}
                url={url}
                shareUrl={shareUrl}
                priority={priority}
                discountPrice={discountPrice}
                currency={currency}
                isOwner={isOwner}
                isWishlist={isWishlist}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            <CardInfo
              id={id}
              name={name}
              description={description}
              formattedPrice={formattedPrice}
              store={store}
              variant={variant}
              isOwner={isOwner}
              isPurchasedMode={isPurchasedMode}
              statusLabel={statusLabel}
              reserveBtnLabel={reserveBtnLabel}
              isPurchased={isPurchased}
              isReservedState={isReservedState}
              canToggleReservation={canToggleReservation}
              canToggleBought={canToggleBought}
              handleReserveClick={handleReserveClick}
              handleBoughtClick={handleBoughtClick}
              onToggleBought={onToggleBought}
              boughtActionLabel={boughtActionLabel}
            />
          </div>
        );
      }}
    </ItemCardBase>
  );
}
