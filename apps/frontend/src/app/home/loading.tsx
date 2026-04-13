import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function HomeLoading() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {/* DashboardHeader */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div>
          <Skeleton variant="heading" width={260} />
          <Skeleton variant="text" width={180} style={{ marginTop: 8 }} />
        </div>
        <Skeleton variant="pill" width={160} height={44} />
      </div>

      {/* StatsRow */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton variant="text" width={100} />
            <Skeleton variant="heading" width={60} style={{ marginTop: 12 }} />
          </SkeletonCard>
        ))}
      </div>

      {/* WishlistGrid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
