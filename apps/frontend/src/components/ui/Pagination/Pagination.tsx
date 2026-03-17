import styles from "./Pagination.module.scss";
import { Button } from "../Button/Button";

type Props = {
  page: number;
  total: number;
  onChange: (n: number) => void;
};

export function Pagination({ page, total, onChange }: Props) {
  return (
    <div className={styles.pagination}>
      <Button
        variant="secondary"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </Button>

      <span>
        {page} / {total}
      </span>

      <Button
        variant="secondary"
        disabled={page === total}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
