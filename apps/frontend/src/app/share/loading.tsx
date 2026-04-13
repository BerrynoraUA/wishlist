import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";
import styles from "../wishlist/[id]/WishlistPage.module.scss";

export default function ShareLoading() {
  return (
    <main className={styles.page}>
      {/* SharedWishlistHeader */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
        <div style={{ marginBottom: 28 }}>
          <Skeleton variant="heading" width={260} />
          <Skeleton variant="text" width={200} style={{ marginTop: 8 }} />
        </div>
      </div>

      {/* WishlistItemsGrid */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 20,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} style={{ padding: 0 }}>
            <Skeleton width="100%" height={160} style={{ borderRadius: "12px 12px 0 0" }} />
            <div style={{ padding: 16 }}>
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="40%" style={{ marginTop: 8 }} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
