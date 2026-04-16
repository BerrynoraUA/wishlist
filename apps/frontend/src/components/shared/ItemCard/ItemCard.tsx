"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import styles from "./ItemCard.module.scss";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { ItemCardBase } from "@/components/shared/ItemCardBase/ItemCardBase";
import {
  buildItemPriorityLabel,
  buildPurchaseActionLabel,
  buildReservationActionLabel,
  buildReservationStatusLabel,
  getItemPriorityKey,
  getSalePercentOff,
} from "@/lib/helpers/item-card";
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
  currency,
  status,
  isReserved,
  reservedBy,
  reservedByName,
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
  voteCount = 0,
  hasVoted = false,
  onToggleVote,
  renderDetailModal,
}: ItemCardProps) {
  const t = useGT();
  const { formatPrice } = useCurrencyFormatter();
  const priorityLabels = useMemo(
    () => ({
      low: t("Low", { $id: "itemCard.priorityLow" }),
      medium: t("Medium", { $id: "itemCard.priorityMedium" }),
      high: t("High", { $id: "itemCard.priorityHigh" }),
    }),
    [t],
  );

  const priorityKey = getItemPriorityKey(priority);
  const priorityDisplay = buildItemPriorityLabel(priority, priorityLabels);

  const formattedPrice = formatPrice(price, currency);
  const salePercentOff = getSalePercentOff(
    price,
    discountPrice,
    showDiscountBadge,
  );
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
            purchasedByYou: () =>
              t("Purchased by you", { $id: "itemCard.purchasedByYou" }),
            purchased: () => t("Purchased", { $id: "itemCard.purchased" }),
            purchasedByName: (n) =>
              t("Purchased by {name}", {
                name: n,
                $id: "itemCard.purchasedByName",
              }),
            reservedByYou: () =>
              t("Reserved by you", { $id: "itemCard.reservedByYou" }),
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
            reservedByYou: () =>
              t("Reserved by you", { $id: "itemCard.reservedByYouBtn" }),
            reserved: () => t("Reserved", { $id: "itemCard.reservedBtn" }),
            available: () =>
              t("Reserve this gift", { $id: "itemCard.reserveGift" }),
          },
        );
        const boughtActionLabel = buildPurchaseActionLabel(isPurchased, {
          purchased: () =>
            t("Mark as not purchased", { $id: "itemCard.unpurchase" }),
          available: () => t("Mark as purchased", { $id: "itemCard.purchase" }),
        });

        return (
          <div
            className={cn(
              styles.card,
              VARIANT_CLASS[variant],
              isPurchasedMode && styles.cardPurchased,
            )}
            onClick={openDetail}
          >
            <div className={styles.imageWrapper}>
              <CardImage image={image} name={name} isWishlist={isWishlist} />

              <CardBadges
                variant={variant}
                isOwner={isOwner}
                statusLabel={statusLabel}
                isPurchased={isPurchased}
                salePercentOff={salePercentOff}
                priorityKey={priorityKey}
                priorityDisplay={priorityDisplay}
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
              voteCount={voteCount}
              hasVoted={hasVoted}
              onToggleVote={onToggleVote}
            />
          </div>
        );
      }}
    </ItemCardBase>
  );
}
