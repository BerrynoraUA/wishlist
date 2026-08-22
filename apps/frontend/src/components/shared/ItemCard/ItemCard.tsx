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
import { ALL_PRIORITIES, getPriorityCssColor, isStarPriorityId } from "@/lib/priorities";
import { PRIORITY_ICONS } from "@/lib/priority-icons";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
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
  variant = "discover",
  showDiscountBadge = false,
  isOwner = false,
  showOwnerReservation = false,
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
  const [reserverRevealed, setReserverRevealed] = React.useState(false);

  const priorityMeta = priority ? ALL_PRIORITIES.find((p) => p.name === priority) : null;
  const priorityColor = priorityMeta ? getPriorityCssColor(priorityMeta) : null;
  const priorityDisplay = priority || null;
  const PriorityIcon: LucideIcon | null = priorityMeta
    ? (PRIORITY_ICONS[priorityMeta.id] ?? null)
    : null;

  // The priority tints the card; Stare additionally keeps its heavier frame.
  const accentColor = priorityColor;
  const hasStarAccent = isStarPriorityId(priorityMeta?.id);

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
          { revealName: reserverRevealed },
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
        // glance. Owners only see this once they opt into the spoiler.
        const isTaken = !!statusLabel && (!isOwner || showOwnerReservation);
        const canRevealReserver = showOwnerReservation && isTaken && Boolean(reservedByName);

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
                <div
                  className={cn(styles.reservedStamp, isPurchased && styles.purchasedStamp)}
                  aria-hidden="true"
                >
                  <span className={cn(reserverRevealed && styles.reservedStampName)}>
                    {reserverRevealed && reservedByName
                      ? reservedByName
                      : isPurchased
                        ? t("Purchased", { $id: "itemCard.purchasedStamp" })
                        : t("Reserved", { $id: "itemCard.reservedStamp" })}
                  </span>
                </div>
              )}

              {canRevealReserver && (
                <button
                  type="button"
                  className={styles.revealReserverButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setReserverRevealed((value) => !value);
                  }}
                  aria-pressed={reserverRevealed}
                  aria-label={
                    reserverRevealed
                      ? t("Hide who reserved this", { $id: "itemCard.hideReserver" })
                      : t("Show who reserved this", { $id: "itemCard.showReserver" })
                  }
                >
                  {reserverRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}

              <CardBadges
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

            {/* Only Stare hangs a medallion off the bottom edge; every other
                priority reads as the badge in the corner. */}
            {hasStarAccent && PriorityIcon && (
              <span
                className={styles.priorityMedallion}
                style={{ "--priority-color": priorityColor } as React.CSSProperties}
                aria-label={priorityDisplay ?? undefined}
                title={priorityDisplay ?? undefined}
              >
                <PriorityIcon size={16} strokeWidth={2.5} />
              </span>
            )}

            <CardInfo
              name={name}
              description={description}
              formattedPrice={formattedPrice}
              store={store}
              variant={variant}
              isOwner={isOwner}
              isPurchasedMode={isPurchasedMode}
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
