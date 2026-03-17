"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { WishlistHeader } from "../components/WishlistHeader";
import { WishlistItemsGrid } from "../components/WishlistItemsGrid";
import {
  useWishlistItems,
  useToggleItemReservation,
  useDeleteItem,
} from "@/hooks/use-items";
import { useWishlistById, useDeleteWishlist } from "@/hooks/use-wishlists";
import { useCurrentUserId } from "@/hooks/use-user";
import { CreateItemModal } from "../components/CreateItemModal";
import { EditItemModal } from "../components/EditItemModal";
import { EditWishlistModal } from "../components/EditWishlistModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { Item } from "@/types/item";
import styles from "./WishlistPage.module.scss";
import { useSubscription } from "@/hooks/use-subscription";
import { useCheckFriendship } from "@/hooks/use-friends";
import { createWishlistShareToken } from "@/api/share";

const PAGE_SIZE = 12;

export default function WishlistItemsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  const { data: currentUserId = "" } = useCurrentUserId();

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [editWishlistOpen, setEditWishlistOpen] = useState(false);
  const [deleteWishlistOpen, setDeleteWishlistOpen] = useState(false);

  const {
    data: wishlist,
    isLoading: wishlistLoading,
    isError: wishlistError,
  } = useWishlistById(id);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useWishlistItems(id, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });

  const toggleReservation = useToggleItemReservation();
  const deleteItemMutation = useDeleteItem();
  const deleteWishlistMutation = useDeleteWishlist();

  const items = itemsData ?? [];
  const isOwner = !!currentUserId && wishlist?.user_id === currentUserId;

  const { isPro } = useSubscription();
  const friendshipCheckUserId =
    !isOwner && !!currentUserId && !!wishlist?.user_id ? wishlist.user_id : "";
  const { data: isFriend = false } = useCheckFriendship(friendshipCheckUserId);
  const showDiscountBadge = !isOwner && isPro && isFriend;

  const totalItems = wishlist?.itemsCount ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleShare = useCallback(async () => {
    try {
      const shareBaseUrl = `${window.location.origin}/share`;
      const { shareUrl } = await createWishlistShareToken(id, { shareBaseUrl });
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      }
    } catch {
      alert("Failed to generate share link.");
    }
  }, [id]);

  return (
    <main className={styles.page}>
      {wishlistLoading && <p>Loading wishlist...</p>}
      {wishlistError && <p>Failed to load wishlist.</p>}
      {wishlist && (
        <WishlistHeader
          wishlist={wishlist}
          onAddItem={isOwner ? () => setCreateOpen(true) : undefined}
          onEdit={isOwner ? () => setEditWishlistOpen(true) : undefined}
          onDelete={isOwner ? () => setDeleteWishlistOpen(true) : undefined}
          onShare={isOwner ? handleShare : undefined}
          isOwner={isOwner}
        />
      )}

      {itemsLoading && <p>Loading items...</p>}
      {itemsError && <p>Failed to load items.</p>}
      {!itemsLoading && !itemsError && items.length === 0 && (
        <p>No items yet.</p>
      )}
      {!itemsLoading && !itemsError && items.length > 0 && (
        <>
          <WishlistItemsGrid
            items={items}
            isOwner={isOwner}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
            onDelete={(itemId) => setDeleteItemId(itemId)}
            onEdit={(item) => setEditItem(item)}
          />
          {totalPages > 1 && (
            <Pagination page={page} total={totalPages} onChange={setPage} />
          )}
        </>
      )}

      {/* Create Item */}
      <CreateItemModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        wishlistId={id}
      />

      {/* Edit Item */}
      {editItem && (
        <EditItemModal
          open={!!editItem}
          onClose={() => setEditItem(null)}
          item={editItem}
        />
      )}

      {/* Delete Item */}
      <DeleteConfirmModal
        open={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) {
            deleteItemMutation.mutate(deleteItemId, {
              onSuccess: () => setDeleteItemId(null),
            });
          }
        }}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        isPending={deleteItemMutation.isPending}
      />

      {/* Edit Wishlist */}
      {wishlist && (
        <EditWishlistModal
          open={editWishlistOpen}
          onClose={() => setEditWishlistOpen(false)}
          wishlist={wishlist}
        />
      )}

      {/* Delete Wishlist */}
      <DeleteConfirmModal
        open={deleteWishlistOpen}
        onClose={() => setDeleteWishlistOpen(false)}
        onConfirm={() => {
          deleteWishlistMutation.mutate(id, {
            onSuccess: () => router.push("/home"),
          });
        }}
        title="Delete Wishlist"
        description="Are you sure you want to delete this entire wishlist and all its items? This action cannot be undone."
        confirmLabel="Delete Wishlist"
        isPending={deleteWishlistMutation.isPending}
      />
    </main>
  );
}
