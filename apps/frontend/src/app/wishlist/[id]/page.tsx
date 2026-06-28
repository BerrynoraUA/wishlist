"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGT } from "gt-next";
import { WishlistHeader } from "./components/wishlist-header/WishlistHeader";
import { WishlistItemsGrid } from "./components/wishlist-items-grid/WishlistItemsGrid";
import {
  useWishlistItems,
  useToggleItemReservation,
  useToggleItemBought,
  useDeleteItem,
} from "@/hooks/use-items";
import { useWishlistById, useDeleteWishlist } from "@/hooks/use-wishlists";
import { CreateItemModal } from "./components/create-item-modal/CreateItemModal";
import { EditItemModal } from "./components/edit-item-modal/EditItemModal";
import { EditWishlistModal } from "./components/edit-wishlist-modal/EditWishlistModal";
import { GrantWishlistAccessModal } from "./components/grant-wishlist-access-modal/GrantWishlistAccessModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { ShareFeedbackModal } from "@/components/ui/ShareFeedbackModal/ShareFeedbackModal";
import { useUserGuideStepCompletion } from "@/components/user-guide/UserGuideProvider";
import styles from "./WishlistPage.module.scss";
import { useCheckFriendship } from "@/hooks/use-friends";
import { useWishlistItemFilters } from "./hooks/use-wishlist-item-filters";
import { WishlistItemFilters } from "./components/wishlist-item-filters/WishlistItemFilters";
import { useWishlistPageModals } from "./hooks/use-wishlist-page-modals";
import { useWishlistShare } from "./hooks/use-wishlist-share";
import { paginationFlags } from "@/lib/filter-helpers";
import { WISHLIST_ITEMS_PAGE_SIZE } from "./constants";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";

export default function WishlistItemsPage() {
  const t = useGT();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    currentUserId,
    openItemId,
    page,
    setPage,
    itemsQueryParams,
    hasCreateItemDraft,
    hasEditWishlistDraft,
    isFiltersActive,
    handleOpenItemHandled,
  } = useWishlistItemFilters(id);

  const modals = useWishlistPageModals();
  const { shareFeedback, closeShareFeedback, handleShare } = useWishlistShare(id);
  const [pendingGuideModalStep, setPendingGuideModalStep] = useState<number | null>(null);
  const completeShareStep = useUserGuideStepCompletion(7);
  const completeManageAccessStep = useUserGuideStepCompletion(8);

  const { data: wishlist, isError: wishlistError } = useWishlistById(id);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isFetching: itemsFetching,
    isError: itemsError,
  } = useWishlistItems(id, itemsQueryParams);

  const { data: allItemsData } = useWishlistItems(id, { skip: 0, take: 1 });

  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const deleteItemMutation = useDeleteItem();
  const deleteWishlistMutation = useDeleteWishlist();

  const items = itemsData ?? [];
  const visibleItems = items.slice(0, WISHLIST_ITEMS_PAGE_SIZE);
  const hasAnyItems = (allItemsData?.length ?? 0) > 0;
  const isOwner = Boolean(wishlist?.is_owner);
  const canEditWishlist = Boolean(wishlist?.can_edit || wishlist?.is_owner);

  const friendshipCheckUserId =
    !isOwner && !!currentUserId && !!wishlist?.user_id ? wishlist.user_id : "";
  const { data: isFriend = false } = useCheckFriendship(friendshipCheckUserId);
  const showDiscountBadge = isOwner || isFriend;

  const { hasNextPage, hasPrevPage, totalForPagination } = paginationFlags(
    page,
    items.length,
    WISHLIST_ITEMS_PAGE_SIZE,
  );

  async function handleGuideShare() {
    const shared = await handleShare();
    if (shared) setPendingGuideModalStep(7);
  }

  function completePendingGuideModal(step: number, completeStep: () => void) {
    if (pendingGuideModalStep === step) {
      completeStep();
      setPendingGuideModalStep(null);
    }
  }

  return (
    <main className={styles.page}>
      {wishlistError && (
        <p>
          {t("Failed to load wishlist.", {
            $id: "wishlist.page.wishlistError",
          })}
        </p>
      )}
      {wishlist && (
        <WishlistHeader
          wishlist={wishlist}
          onAddItem={canEditWishlist ? () => modals.setCreateOpen(true) : undefined}
          onEdit={
            canEditWishlist
              ? () => {
                  modals.setEditWishlistOpen(true);
                }
              : undefined
          }
          onDelete={
            isOwner
              ? () => {
                  modals.setDeleteWishlistOpen(true);
                }
              : undefined
          }
          onShare={handleGuideShare}
          onManageAccess={
            isOwner
              ? () => {
                  setPendingGuideModalStep(8);
                  modals.setGrantAccessOpen(true);
                }
              : undefined
          }
          isOwner={isOwner}
          hasAddItemDraft={hasCreateItemDraft}
          hasEditWishlistDraft={hasEditWishlistDraft}
        />
      )}

      {itemsError && <p>{t("Failed to load items.", { $id: "wishlist.page.itemsError" })}</p>}
      {!itemsError && (
        <section
          className={styles.itemsSection}
          style={{
            opacity: itemsFetching && !itemsLoading ? 0.6 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <div className={styles.toolbar}>
            <h2 className={styles.sectionTitle}>
              {t("Items", { $id: "wishlist.page.itemsTitle" })}
            </h2>

            <WishlistItemFilters wishlistId={id} />
          </div>

          {!itemsLoading && !hasAnyItems && !isFiltersActive && (
            <MascotEmptyState
              variant={canEditWishlist ? "gift-in-hands" : "empty-hands-shrug"}
              message={t("No items yet.", { $id: "wishlist.page.noItems" })}
            />
          )}

          {!itemsLoading && visibleItems.length === 0 && isFiltersActive && (
            <MascotEmptyState
              variant="magnifying-glass"
              message={t("No items match your filters.", {
                $id: "wishlist.page.noFilteredItems",
              })}
            />
          )}

          {!itemsLoading && visibleItems.length > 0 && (
            <>
              <WishlistItemsGrid
                items={visibleItems}
                isOwner={canEditWishlist}
                showDiscountBadge={showDiscountBadge}
                onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
                onToggleBought={(itemId) => toggleBought.mutate(itemId)}
                onDelete={(itemId) => modals.setDeleteItemId(itemId)}
                onEdit={(item) => modals.setEditItem(item)}
                onAddItem={
                  canEditWishlist && !hasNextPage ? () => modals.setCreateOpen(true) : undefined
                }
                hasAddItemDraft={hasCreateItemDraft}
                openItemId={openItemId}
                onOpenItemHandled={handleOpenItemHandled}
              />
              {(hasPrevPage || hasNextPage) && (
                <Pagination page={page} total={totalForPagination} onChange={setPage} />
              )}
            </>
          )}
        </section>
      )}

      {/* Create Item */}
      <CreateItemModal
        open={modals.createOpen}
        onClose={() => modals.setCreateOpen(false)}
        wishlistId={id}
      />

      {/* Edit Item */}
      {modals.editItem && (
        <EditItemModal
          open={!!modals.editItem}
          onClose={() => modals.setEditItem(null)}
          item={modals.editItem}
        />
      )}

      {/* Delete Item */}
      <DeleteConfirmModal
        open={!!modals.deleteItemId}
        onClose={() => modals.setDeleteItemId(null)}
        onConfirm={() => {
          if (modals.deleteItemId) {
            deleteItemMutation.mutate(modals.deleteItemId, {
              onSuccess: () => modals.setDeleteItemId(null),
            });
          }
        }}
        title={t("Delete Item", { $id: "wishlist.page.deleteItemTitle" })}
        description={t("Are you sure you want to delete this item? This action cannot be undone.", {
          $id: "wishlist.page.deleteItemDescription",
        })}
        isPending={deleteItemMutation.isPending}
      />

      {/* Edit Wishlist */}
      {wishlist && (
        <EditWishlistModal
          open={modals.editWishlistOpen}
          onClose={() => {
            modals.setEditWishlistOpen(false);
          }}
          wishlist={wishlist}
        />
      )}

      {wishlist && (
        <GrantWishlistAccessModal
          open={modals.grantAccessOpen}
          onClose={() => {
            modals.setGrantAccessOpen(false);
            completePendingGuideModal(8, completeManageAccessStep);
          }}
          wishlistId={wishlist.id}
          wishlistTitle={wishlist.title}
        />
      )}

      {/* Delete Wishlist */}
      <DeleteConfirmModal
        open={modals.deleteWishlistOpen}
        onClose={() => {
          modals.setDeleteWishlistOpen(false);
        }}
        onConfirm={() => {
          deleteWishlistMutation.mutate(id, {
            onSuccess: () => router.push("/home"),
          });
        }}
        title={t("Delete Wishlist", {
          $id: "wishlist.page.deleteWishlistTitle",
        })}
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
        onClose={() => {
          closeShareFeedback();
          completePendingGuideModal(7, completeShareStep);
        }}
        variant={shareFeedback.variant}
        title={shareFeedback.title}
        description={shareFeedback.description}
        link={shareFeedback.link}
      />
    </main>
  );
}
