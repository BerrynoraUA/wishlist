"use client";

import { useGT } from "gt-next";
import { useMemo, useState } from "react";
import { WishlistCard } from "./WishlistCard";
import styles from "./WishlistGrid.module.scss";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { useSearchParams } from "next/navigation";

const PAGE_SIZE = 8;

export function WishlistGrid() {
  const t = useGT();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const search = useMemo(() => searchParams.get("search") ?? "", [searchParams]);

  const { data, isLoading, isError } = useMyWishlists({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    search,
  });

  const wishlists = data ?? [];
  const showPagination = wishlists.length === PAGE_SIZE || page > 1;

  return (
    <div>
      <h2 className={styles.title}>{t("Wishlists", { $id: "home.wishlistGrid.title" })}</h2>
      <div className={styles.grid}>
        {isLoading && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i}>
                <Skeleton variant="heading" width="70%" />
                <Skeleton variant="text" width="40%" style={{ marginTop: 10 }} />
              </SkeletonCard>
            ))}
          </>
        )}
        {isError && (
          <p>
            {t("Failed to load wishlists.", {
              $id: "home.wishlistGrid.error",
            })}
          </p>
        )}
        {!isLoading && !isError && wishlists.length === 0 && (
          <p>{t("No wishlists yet.", { $id: "home.wishlistGrid.empty" })}</p>
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
