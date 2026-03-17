"use client";

import { useMemo, useState } from "react";
import { WishlistCard } from "./WishlistCard";
import styles from "./WishlistGrid.module.scss";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { useSearchParams } from "next/navigation";

const PAGE_SIZE = 8;

export function WishlistGrid() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const search = useMemo(
    () => searchParams.get("search") ?? "",
    [searchParams],
  );

  const { data, isLoading, isError } = useMyWishlists({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    search,
  });

  const wishlists = data ?? [];
  const showPagination = wishlists.length === PAGE_SIZE || page > 1;

  return (
    <div>
      <h2 className={styles.title}>My Wishlists</h2>
      <div className={styles.grid}>
        {isLoading && <p>Loading...</p>}
        {isError && <p>Failed to load wishlists.</p>}
        {!isLoading && !isError && wishlists.length === 0 && (
          <p>No wishlists yet.</p>
        )}
        {wishlists.map((w) => (
          <WishlistCard key={w.id} wishlist={w} />
        ))}
      </div>

      {showPagination && (
        <Pagination
          page={page}
          total={wishlists.length < PAGE_SIZE ? page : page + 1}
          onChange={setPage}
        />
      )}
    </div>
  );
}
