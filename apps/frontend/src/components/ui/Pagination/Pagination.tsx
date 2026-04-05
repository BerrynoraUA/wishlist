"use client";

import { useGT } from "gt-next";
import styles from "./Pagination.module.scss";

type Props = {
  page: number;
  total: number;
  onChange: (n: number) => void;
};

type PaginationItem = number | "ellipsis";

function buildPaginationItems(page: number, total: number): PaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, "ellipsis", total];
  }

  if (page >= total - 2) {
    return [1, "ellipsis", total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", total];
}

export function Pagination({ page, total, onChange }: Props) {
  const t = useGT();

  if (total <= 1) {
    return null;
  }

  const items = buildPaginationItems(page, total);

  return (
    <nav
      className={styles.pagination}
      aria-label={t("Pagination", { $id: "pagination.navLabel" })}
    >
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.controlButton} ${styles.navButton}`}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label={t("Go to previous page", {
            $id: "pagination.previous"
          })}
        >
          <span className={styles.navArrow} aria-hidden="true">
            &lt;
          </span>
          <span className={styles.navText}>
            {t("Previous", { $id: "pagination.previousText" })}
          </span>
        </button>

        <div className={styles.pages}>
          {items.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className={styles.ellipsis}
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isActive = item === page;

            return (
              <button
                key={item}
                type="button"
                className={`${styles.controlButton} ${styles.pageButton} ${isActive ? styles.active : ""}`}
                onClick={() => onChange(item)}
                aria-current={isActive ? "page" : undefined}
                aria-label={t("Go to page {n}", {
                  n: item,
                  $id: "pagination.goToPage"
                })}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.controlButton} ${styles.navButton}`}
          disabled={page === total}
          onClick={() => onChange(page + 1)}
          aria-label={t("Go to next page", { $id: "pagination.next" })}
        >
          <span className={styles.navText}>
            {t("Next", { $id: "pagination.nextText" })}
          </span>
          <span className={styles.navArrow} aria-hidden="true">
            &gt;
          </span>
        </button>
      </div>
    </nav>
  );
}
