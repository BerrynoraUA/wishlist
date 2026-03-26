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
  if (total <= 1) {
    return null;
  }

  const items = buildPaginationItems(page, total);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.controlButton} ${styles.navButton}`}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label="Go to previous page"
        >
          <span className={styles.navArrow} aria-hidden="true">
            &lt;
          </span>
          <span className={styles.navText}>Previous</span>
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
                aria-label={`Go to page ${item}`}
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
          aria-label="Go to next page"
        >
          <span className={styles.navText}>Next</span>
          <span className={styles.navArrow} aria-hidden="true">
            &gt;
          </span>
        </button>
      </div>
    </nav>
  );
}
