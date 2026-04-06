import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function FriendWishlistsLoading() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header: back + title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Skeleton variant="circle" width={38} height={38} />
          <div>
            <Skeleton variant="heading" width={220} />
            <Skeleton variant="text" width={100} style={{ marginTop: 6 }} />
          </div>
        </div>
        <Skeleton variant="pill" width={140} height={36} />
      </div>

      {/* WishlistGrid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ padding: 0 }}>
            <Skeleton width="100%" height={140} style={{ borderRadius: "12px 12px 0 0" }} />
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
