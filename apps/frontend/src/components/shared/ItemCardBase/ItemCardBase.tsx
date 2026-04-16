"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useCurrentUserId } from "@/hooks/use-user";
import {
  ActionConfirmModal,
  type ItemActionConfirmType,
} from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import { getItemReservationState, getNextConfirmAction } from "@/lib/helpers/item-card";

type ItemCardBaseProps = {
  itemId: string;
  itemName: string;
  status?: number | null;
  isReserved?: boolean;
  reservedBy?: string | null;
  isOwner?: boolean;
  reservedByCurrentUser?: boolean;
  autoOpen?: boolean;
  onAutoOpenHandled?: (id: string) => void;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  renderDetailModal?: (options: { open: boolean; onClose: () => void }) => ReactNode;
  children: (controller: ItemCardBaseController) => ReactNode;
};

export type ItemCardBaseController = ReturnType<typeof getItemReservationState> & {
  currentUserId: string;
  detailOpen: boolean;
  openDetail: () => void;
  closeDetail: () => void;
  confirmAction: ItemActionConfirmType | null;
  setConfirmAction: (action: ItemActionConfirmType | null) => void;
  handleReserveClick: () => void;
  handleBoughtClick: () => void;
};

export function ItemCardBase({
  itemId,
  itemName,
  status,
  isReserved = false,
  reservedBy,
  isOwner = false,
  reservedByCurrentUser = false,
  autoOpen = false,
  onAutoOpenHandled,
  onToggleReserve,
  onToggleBought,
  renderDetailModal,
  children,
}: ItemCardBaseProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ItemActionConfirmType | null>(null);
  const { data: currentUserId = "" } = useCurrentUserId();

  const reservationState = getItemReservationState({
    status,
    isReserved,
    reservedBy,
    currentUserId,
    isOwner,
    reservedByCurrentUser,
  });

  useEffect(() => {
    if (!autoOpen) return;

    setDetailOpen(true);
    onAutoOpenHandled?.(itemId);
  }, [autoOpen, itemId, onAutoOpenHandled]);

  function handleReserveClick() {
    if (!reservationState.canToggleReservation || !onToggleReserve) return;
    setConfirmAction(getNextConfirmAction("reserve", reservationState.isReserved));
  }

  function handleBoughtClick() {
    if (!reservationState.canToggleBought || !onToggleBought) return;
    setConfirmAction(getNextConfirmAction("purchase", reservationState.isPurchased));
  }

  function handleConfirmAction() {
    if (!confirmAction) return;

    if (confirmAction === "reserve" || confirmAction === "unreserve") {
      onToggleReserve?.(itemId);
    } else {
      onToggleBought?.(itemId);
    }

    setConfirmAction(null);
  }

  return (
    <>
      {children({
        ...reservationState,
        currentUserId,
        detailOpen,
        openDetail: () => setDetailOpen(true),
        closeDetail: () => setDetailOpen(false),
        confirmAction,
        setConfirmAction,
        handleReserveClick,
        handleBoughtClick,
      })}

      {renderDetailModal?.({
        open: detailOpen,
        onClose: () => setDetailOpen(false),
      })}

      <ActionConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        action={confirmAction ?? "reserve"}
        itemName={itemName}
      />
    </>
  );
}
