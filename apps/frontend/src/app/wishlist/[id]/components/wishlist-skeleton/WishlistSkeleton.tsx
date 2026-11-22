import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";
import gridStyles from "../wishlist-items-grid/WishlistItemsGrid.module.scss";

export function WishlistHeaderSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <Skeleton variant="heading" width={240} />
          <Skeleton variant="text" width={160} style={{ marginTop: 8 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton variant="pill" width={100} height={36} />
          <Skeleton variant="pill" width={100} height={36} />
        </div>
      </div>
    </div>
  );
}

export function WishlistItemsGridSkeleton() {
  return (
    <div className={gridStyles.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} style={{ padding: 0 }}>
          <Skeleton width="100%" height={160} style={{ borderRadius: "12px 12px 0 0" }} />
          <div style={{ padding: 16 }}>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" style={{ marginTop: 8 }} />
            <Skeleton variant="text" width="30%" style={{ marginTop: 8 }} />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
