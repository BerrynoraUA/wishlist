"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { useGT } from "gt-next";
import { RotateCcw } from "lucide-react";
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
import { useCheckFriendship } from "@/hooks/use-friends";
import { createWishlistShareToken } from "@/api/share";
import {
  ActiveFilters,
  FilterDropdown,
  FilterSortActions,
  FilterSortBar,
  FilterSortRow,
  NumberRangeFilter,
  SearchFilter,
  SortSelect,
} from "@/components/ui/FilterSortBar";
import { useDebouncedQueryParam } from "@/hooks/use-debounced-query-param";
import { useQueryParams } from "@/hooks/use-query-params";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import {
  ITEM_STATUS_OPTIONS,
  ITEM_STATUS_MAP,
  ITEM_STATUS_LABELS,
  ITEM_PRIORITY_OPTIONS,
  ITEM_PRIORITY_LABELS,
  ITEM_SORT_OPTIONS,
  DEFAULT_SORT,
} from "@/lib/filter-constants";
import {
  getMultiParamValues,
  parsePage,
  parseOptionalNumber,
  mapFilterValues,
  toNumberArray,
  paginationFlags,
  hasActiveFilters,
} from "@/lib/filter-helpers";

const PAGE_SIZE = 12;

export default function WishlistItemsPage() {
  const t = useGT();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    searchParams,
    updateQueryParams,
    setPage,
    setSingleValueParam,
    setMultiValueParam,
  } = useQueryParams(`/wishlist/${id}`);
  const openItemId = searchParams.get("item");
  const page = parsePage(searchParams);
  const { value: itemSearch, setValue: setItemSearch } = useDebouncedQueryParam(
    {
      key: "itemSearch",
    },
  );
  const { value: itemPriceMin, setValue: setItemPriceMin } =
    useDebouncedQueryParam({
      key: "itemPriceMin",
    });
  const { value: itemPriceMax, setValue: setItemPriceMax } =
    useDebouncedQueryParam({
      key: "itemPriceMax",
    });
  const itemSort = searchParams.get("itemSort") ?? DEFAULT_SORT;
  const itemStatuses = useMemo(
    () => getMultiParamValues(searchParams, "itemStatus"),
    [searchParams],
  );
  const itemPriorities = useMemo(
    () => getMultiParamValues(searchParams, "itemPriority"),
    [searchParams],
  );
  const { data: currentUserId = "" } = useCurrentUserId();
  const hasCreateItemDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "create-item",
    scopeId: id,
  });
  const hasEditWishlistDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "edit-wishlist",
    scopeId: id,
  });
  const normalizedPriceMin = parseOptionalNumber(itemPriceMin);
  const normalizedPriceMax = parseOptionalNumber(itemPriceMax);

  const statusNumbers = useMemo(
    () => mapFilterValues(itemStatuses, ITEM_STATUS_MAP),
    [itemStatuses],
  );
  const priorityNumbers = useMemo(
    () => toNumberArray(itemPriorities),
    [itemPriorities],
  );

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

  const { data: wishlist, isError: wishlistError } = useWishlistById(id);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isFetching: itemsFetching,
    isError: itemsError,
  } = useWishlistItems(id, {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    search: itemSearch.trim() || undefined,
    sort: itemSort,
    statuses: statusNumbers.length ? statusNumbers : undefined,
    priorities: priorityNumbers.length ? priorityNumbers : undefined,
    priceMin: normalizedPriceMin,
    priceMax: normalizedPriceMax,
  });

  const { data: allItemsData } = useWishlistItems(id, { skip: 0, take: 1 });

  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const deleteItemMutation = useDeleteItem();
  const deleteWishlistMutation = useDeleteWishlist();

  const items = itemsData ?? [];
  const hasAnyItems = (allItemsData?.length ?? 0) > 0;
  const isOwner = Boolean(wishlist?.is_owner);
  const canEditWishlist = Boolean(wishlist?.can_edit || wishlist?.is_owner);

  const friendshipCheckUserId =
    !isOwner && !!currentUserId && !!wishlist?.user_id ? wishlist.user_id : "";
  const { data: isFriend = false } = useCheckFriendship(friendshipCheckUserId);
  const showDiscountBadge = !isOwner && isFriend;

  const isFiltersActive = hasActiveFilters(
    itemSearch,
    [itemStatuses, itemPriorities],
    [normalizedPriceMin, normalizedPriceMax],
  );
  const { hasNextPage, hasPrevPage, totalForPagination } = paginationFlags(
    page,
    items.length,
    PAGE_SIZE,
  );

  const activeFilterItems = [
    ...itemStatuses.map((status) => ({
      key: `itemStatus::${status}`,
      label: ITEM_STATUS_LABELS[status] ?? status,
      groupLabel: t("Status", { $id: "wishlist.items.filter.status" }),
    })),
    ...itemPriorities.map((priority) => ({
      key: `itemPriority::${priority}`,
      label: ITEM_PRIORITY_LABELS[priority] ?? priority,
      groupLabel: t("Priority", { $id: "wishlist.items.filter.priority" }),
    })),
    ...(normalizedPriceMin !== null
      ? [
          {
            key: "itemPriceMin::value",
            label: `${t("From", { $id: "wishlist.items.price.from" })} ${normalizedPriceMin}`,
            groupLabel: t("Price", { $id: "wishlist.items.filter.price" }),
          },
        ]
      : []),
    ...(normalizedPriceMax !== null
      ? [
          {
            key: "itemPriceMax::value",
            label: `${t("To", { $id: "wishlist.items.price.to" })} ${normalizedPriceMax}`,
            groupLabel: t("Price", { $id: "wishlist.items.filter.price" }),
          },
        ]
      : []),
  ];

  const handleRemoveActiveFilter = useCallback(
    (key: string) => {
      const [paramKey, value] = key.split("::");
      if (paramKey === "itemPriceMin") {
        setItemPriceMin("");
        setPage(1);
        return;
      }

      if (paramKey === "itemPriceMax") {
        setItemPriceMax("");
        setPage(1);
        return;
      }

      const queryKey =
        paramKey === "itemStatus" ? "itemStatus" : "itemPriority";
      const currentValues = getMultiParamValues(searchParams, queryKey);
      setMultiValueParam(
        queryKey,
        currentValues.filter((current) => current !== value),
      );
    },
    [
      searchParams,
      setItemPriceMax,
      setItemPriceMin,
      setMultiValueParam,
      setPage,
    ],
  );

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
      if (searchParams.get("item") !== itemId) return;
      updateQueryParams((p) => p.delete("item"));
    },
    [searchParams, updateQueryParams],
  );

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
          onAddItem={canEditWishlist ? () => setCreateOpen(true) : undefined}
          onEdit={canEditWishlist ? () => setEditWishlistOpen(true) : undefined}
          onDelete={isOwner ? () => setDeleteWishlistOpen(true) : undefined}
          onShare={handleShare}
          onManageAccess={isOwner ? () => setGrantAccessOpen(true) : undefined}
          isOwner={isOwner}
          hasAddItemDraft={hasCreateItemDraft}
          hasEditWishlistDraft={hasEditWishlistDraft}
        />
      )}

      {itemsError && (
        <p>{t("Failed to load items.", { $id: "wishlist.page.itemsError" })}</p>
      )}
      {!itemsError && (
        <>
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

              <FilterSortBar className={styles.filterBar}>
                <FilterSortRow className={styles.filterRow}>
                  <SearchFilter
                    value={itemSearch}
                    onChange={(value) => {
                      setItemSearch(value);
                      setPage(1);
                    }}
                    placeholder={t("Search items...", {
                      $id: "wishlist.page.searchItems",
                    })}
                  />
                  <FilterDropdown
                    label={t("Status", { $id: "wishlist.items.filter.status" })}
                    options={ITEM_STATUS_OPTIONS.map((option) => ({
                      ...option,
                      label: t(option.label, {
                        $id: `wishlist.items.status.${option.value}`,
                      }),
                    }))}
                    active={itemStatuses}
                    onChange={(values) =>
                      setMultiValueParam("itemStatus", values)
                    }
                    multiSelect
                  />
                  <FilterDropdown
                    label={t("Priority", {
                      $id: "wishlist.items.filter.priority",
                    })}
                    options={ITEM_PRIORITY_OPTIONS.map((option) => ({
                      ...option,
                      label: t(option.label, {
                        $id: `wishlist.items.priority.${option.value}`,
                      }),
                    }))}
                    active={itemPriorities}
                    onChange={(values) =>
                      setMultiValueParam("itemPriority", values)
                    }
                    multiSelect
                  />
                  <NumberRangeFilter
                    label={t("Price", { $id: "wishlist.items.filter.price" })}
                    minValue={itemPriceMin}
                    maxValue={itemPriceMax}
                    onMinChange={(value) => {
                      setItemPriceMin(value);
                      setPage(1);
                    }}
                    onMaxChange={(value) => {
                      setItemPriceMax(value);
                      setPage(1);
                    }}
                    minPlaceholder={t("From", {
                      $id: "wishlist.items.price.from",
                    })}
                    maxPlaceholder={t("To", { $id: "wishlist.items.price.to" })}
                  />
                  <FilterSortActions>
                    {isFiltersActive && (
                      <button
                        type="button"
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                          setItemSearch("");
                          setItemPriceMin("");
                          setItemPriceMax("");
                          updateQueryParams((nextParams) => {
                            nextParams.delete("itemStatus");
                            nextParams.delete("itemPriority");
                            nextParams.delete("itemPriceMin");
                            nextParams.delete("itemPriceMax");
                            nextParams.delete("itemSearch");
                            nextParams.delete("page");
                          });
                        }}
                        title={t("Clear filters", {
                          $id: "filter.clearFilters",
                        })}
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <SortSelect
                      options={ITEM_SORT_OPTIONS.map((option) => ({
                        ...option,
                        label: t(option.label, {
                          $id: `wishlist.items.sort.${option.value}`,
                        }),
                      }))}
                      value={itemSort}
                      onChange={(value) =>
                        setSingleValueParam("itemSort", value, DEFAULT_SORT)
                      }
                    />
                  </FilterSortActions>
                </FilterSortRow>
                <ActiveFilters
                  items={activeFilterItems}
                  onRemove={handleRemoveActiveFilter}
                  onClearAll={() => {
                    updateQueryParams((nextParams) => {
                      nextParams.delete("itemStatus");
                      nextParams.delete("itemPriority");
                      nextParams.delete("itemPriceMin");
                      nextParams.delete("itemPriceMax");
                      nextParams.delete("page");
                    });
                  }}
                  clearLabel={t("Clear all", { $id: "filter.clearAll" })}
                />
              </FilterSortBar>
            </div>

            {!itemsLoading && !hasAnyItems && !isFiltersActive && (
              <p>{t("No items yet.", { $id: "wishlist.page.noItems" })}</p>
            )}

            {!itemsLoading && items.length === 0 && isFiltersActive && (
              <p>
                {t("No items match your filters.", {
                  $id: "wishlist.page.noFilteredItems",
                })}
              </p>
            )}

            {!itemsLoading && items.length > 0 && (
              <>
                <WishlistItemsGrid
                  items={items}
                  isOwner={canEditWishlist}
                  showDiscountBadge={showDiscountBadge}
                  onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
                  onToggleBought={(itemId) => toggleBought.mutate(itemId)}
                  onDelete={(itemId) => setDeleteItemId(itemId)}
                  onEdit={(item) => setEditItem(item)}
                  onAddItem={
                    canEditWishlist ? () => setCreateOpen(true) : undefined
                  }
                  hasAddItemDraft={hasCreateItemDraft}
                  openItemId={openItemId}
                  onOpenItemHandled={handleOpenItemHandled}
                />
                {(hasPrevPage || hasNextPage) && (
                  <Pagination
                    page={page}
                    total={totalForPagination}
                    onChange={setPage}
                  />
                )}
              </>
            )}
          </section>
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
          {
            $id: "wishlist.page.deleteItemDescription",
          },
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
