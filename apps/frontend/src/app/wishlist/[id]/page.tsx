"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useGT } from "gt-next";
import { WishlistHeader } from "../components/WishlistHeader";
import { WishlistItemsGrid } from "../components/WishlistItemsGrid";
import {
  useWishlistItems,
  useToggleItemReservation,
  useToggleItemBought,
  useDeleteItem,
} from "@/hooks/use-items";
import { useWishlistById, useDeleteWishlist } from "@/hooks/use-wishlists";
import { useCurrentUserId } from "@/hooks/use-user";
import { CreateItemModal } from "../components/CreateItemModal";
import { EditItemModal } from "../components/EditItemModal";
import { EditWishlistModal } from "../components/EditWishlistModal";
import { GrantWishlistAccessModal } from "../components/GrantWishlistAccessModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { ShareFeedbackModal } from "@/components/ui/ShareFeedbackModal/ShareFeedbackModal";
import { Item } from "@/types/item";
import styles from "./WishlistPage.module.scss";
import { useSubscription } from "@/hooks/use-subscription";
import { useCheckFriendship } from "@/hooks/use-friends";
import { createWishlistShareToken } from "@/api/share";

const PAGE_SIZE = 12;

export default function WishlistItemsPage() {
  const t = useGT();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const openItemId = searchParams.get("item");
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const [page, setPage] = useState(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  );
  const { data: currentUserId = "" } = useCurrentUserId();

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [editWishlistOpen, setEditWishlistOpen] = useState(false);
  const [deleteWishlistOpen, setDeleteWishlistOpen] = useState(false);
  const [grantAccessOpen, setGrantAccessOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{
    open: boolean;
    variant: "success" | "error";
    title: string;
    description: string;
    link?: string | null;
  }>({
    open: false,
    variant: "success",
    title: "",
    description: "",
    link: null,
  });

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
  const toggleBought = useToggleItemBought();
  const deleteItemMutation = useDeleteItem();
  const deleteWishlistMutation = useDeleteWishlist();

  const items = itemsData ?? [];
  const isOwner = Boolean(wishlist?.is_owner);
  const canEditWishlist = Boolean(wishlist?.can_edit || wishlist?.is_owner);

  const { isPro } = useSubscription();
  const friendshipCheckUserId =
    !isOwner && !!currentUserId && !!wishlist?.user_id ? wishlist.user_id : "";
  const { data: isFriend = false } = useCheckFriendship(friendshipCheckUserId);
  const showDiscountBadge = !isOwner && isPro && isFriend;

  const totalItems = wishlist?.items_count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleShare = useCallback(async () => {
    try {
      const shareBaseUrl = `${window.location.origin}/share`;
      const { shareUrl } = await createWishlistShareToken(id, { shareBaseUrl });
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback({
          open: true,
          variant: "success",
          title: t("Link copied", { $id: "wishlist.share.linkCopiedTitle" }),
          description: t("Your wishlist share link is ready to send.", {
            $id: "wishlist.share.linkCopiedDescription",
          }),
          link: shareUrl,
        });
        return;
      }

      setShareFeedback({
        open: true,
        variant: "error",
        title: t("Could not create link", {
          $id: "wishlist.share.createLinkErrorTitle",
        }),
        description: t("We couldn't generate a share link for this wishlist.", {
          $id: "wishlist.share.createLinkErrorDescription",
        }),
        link: null,
      });
    } catch {
      setShareFeedback({
        open: true,
        variant: "error",
        title: t("Share failed", { $id: "wishlist.share.shareFailedTitle" }),
        description: t("Something went wrong while creating the share link.", {
          $id: "wishlist.share.shareFailedDescription",
        }),
        link: null,
      });
    }
  }, [id, t]);

  const handleOpenItemHandled = useCallback(
    (itemId: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (nextParams.get("item") !== itemId) {
        return;
      }

      nextParams.delete("item");
      const nextQuery = nextParams.toString();
      router.replace(
        nextQuery ? `/wishlist/${id}?${nextQuery}` : `/wishlist/${id}`,
        {
          scroll: false,
        },
      );
    },
    [searchParams, router, id],
  );

  return (
    <main className={styles.page}>
      {wishlistLoading && (
        <p>{t("Loading wishlist...", { $id: "wishlist.page.loadingWishlist" })}</p>
      )}
      {wishlistError && (
        <p>{t("Failed to load wishlist.", { $id: "wishlist.page.wishlistError" })}</p>
      )}
      {wishlist && (
        <WishlistHeader
          wishlist={wishlist}
          onAddItem={canEditWishlist ? () => setCreateOpen(true) : undefined}
          onEdit={canEditWishlist ? () => setEditWishlistOpen(true) : undefined}
          onDelete={isOwner ? () => setDeleteWishlistOpen(true) : undefined}
          onShare={handleShare}
          onManageAccess={isOwner ? () => setGrantAccessOpen(true) : undefined}
          isOwner={isOwner}
        />
      )}

      {itemsLoading && (
        <p>{t("Loading items...", { $id: "wishlist.page.loadingItems" })}</p>
      )}
      {itemsError && (
        <p>{t("Failed to load items.", { $id: "wishlist.page.itemsError" })}</p>
      )}
      {!itemsLoading && !itemsError && items.length === 0 && (
        <p>{t("No items yet.", { $id: "wishlist.page.noItems" })}</p>
      )}
      {!itemsLoading && !itemsError && items.length > 0 && (
        <>
          <WishlistItemsGrid
            items={items}
            isOwner={canEditWishlist}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
            onToggleBought={(itemId) => toggleBought.mutate(itemId)}
            onDelete={(itemId) => setDeleteItemId(itemId)}
            onEdit={(item) => setEditItem(item)}
            openItemId={openItemId}
            onOpenItemHandled={handleOpenItemHandled}
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
        title={t("Delete Item", { $id: "wishlist.page.deleteItemTitle" })}
        description={t(
          "Are you sure you want to delete this item? This action cannot be undone.",
          { $id: "wishlist.page.deleteItemDescription" },
        )}
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

      {wishlist && (
        <GrantWishlistAccessModal
          open={grantAccessOpen}
          onClose={() => setGrantAccessOpen(false)}
          wishlistId={wishlist.id}
          wishlistTitle={wishlist.title}
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
        title={t("Delete Wishlist", { $id: "wishlist.page.deleteWishlistTitle" })}
        description={t(
          "Are you sure you want to delete this entire wishlist and all its items? This action cannot be undone.",
          { $id: "wishlist.page.deleteWishlistDescription" },
        )}
        confirmLabel={t("Delete Wishlist", {
          $id: "wishlist.page.deleteWishlistConfirm",
        })}
        isPending={deleteWishlistMutation.isPending}
      />

      <ShareFeedbackModal
        open={shareFeedback.open}
        onClose={() =>
          setShareFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
        variant={shareFeedback.variant}
        title={shareFeedback.title}
        description={shareFeedback.description}
        link={shareFeedback.link}
      />
    </main>
  );
}
