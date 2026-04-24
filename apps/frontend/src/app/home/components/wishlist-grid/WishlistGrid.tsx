"use client";

import { useGT } from "gt-next";
import { AddCard } from "@/components/ui/AddCard/AddCard";
import { WishlistCard } from "../wishlist-card/WishlistCard";
import { WishlistFilters } from "../wishlist-filters/WishlistFilters";
import styles from "./WishlistGrid.module.scss";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { WishlistCardSkeleton, WishlistGridToolbarSkeleton } from "../home-skeleton/HomeSkeleton";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { Wishlist } from "@/types/wishlist";
import { paginationFlags } from "@/lib/filter-helpers";
import { WISHLIST_PAGE_SIZE } from "../../constants";
import { useHomeWishlistFilters } from "../../hooks/use-home-wishlist-filters";

type Props = {
  onCreateWishlist: () => void;
  onEditWishlist: (wishlist: Wishlist) => void;
  onDeleteWishlist: (wishlist: Wishlist) => void;
  hasCreateDraft?: boolean;
};

export function WishlistGrid({
  onCreateWishlist,
  onEditWishlist,
  onDeleteWishlist,
  hasCreateDraft = false,
}: Props) {
  const t = useGT();
  const { page, setPage, queryParams, isFiltersActive } = useHomeWishlistFilters();

  const { data, isLoading, isFetching, isError } = useMyWishlists(queryParams);

  const wishlists = data ?? [];

  const { showPagination, totalForPagination } = paginationFlags(
    page,
    wishlists.length,
    WISHLIST_PAGE_SIZE,
  );

  if (isLoading) {
    return (
      <div>
        <WishlistGridToolbarSkeleton />
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h2 className={styles.title}>{t("Wishlists", { $id: "home.wishlistGrid.title" })}</h2>

        <WishlistFilters />
      </div>

      <div
        className={styles.grid}
        style={{
          opacity: isFetching && !isLoading ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {isError && (
          <p>
            {t("Failed to load wishlists.", {
              $id: "home.wishlistGrid.error",
            })}
          </p>
        )}
        {!isError && wishlists.length === 0 && isFiltersActive && (
          <p className={styles.noResults}>
            {t("No wishlists match your filters.", {
              $id: "filter.noResults",
            })}
          </p>
        )}
        {wishlists.map((w) => (
          <WishlistCard
            key={w.id}
            wishlist={w}
            onEdit={w.is_owner || w.can_edit ? () => onEditWishlist(w) : undefined}
            onDelete={w.is_owner ? () => onDeleteWishlist(w) : undefined}
          />
        ))}
        {!isError && wishlists.length > 0 && (
          <AddCard
            onClick={onCreateWishlist}
            label={t("Create wishlist", {
              $id: "home.wishlistGrid.createCardLabel",
            })}
            hasDraft={hasCreateDraft}
          />
        )}
      </div>

      {showPagination && <Pagination page={page} total={totalForPagination} onChange={setPage} />}
    </div>
  );
}
