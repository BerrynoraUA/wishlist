import {
  WishlistHeaderSkeleton,
  WishlistItemsGridSkeleton,
} from "./components/wishlist-skeleton/WishlistSkeleton";
import styles from "./WishlistPage.module.scss";

export default function WishlistLoading() {
  return (
    <main className={styles.page}>
      <WishlistHeaderSkeleton />
      <section className={styles.itemsSection}>
        <WishlistItemsGridSkeleton />
      </section>
    </main>
  );
}
