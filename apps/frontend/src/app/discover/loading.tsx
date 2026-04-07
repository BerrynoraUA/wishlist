import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function DiscoverLoading() {
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      {/* DiscoverHeader */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton variant="heading" width={180} />
        <Skeleton variant="text" width={300} style={{ marginTop: 8 }} />
      </div>

      {/* UpcomingEvents bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "hidden" }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={200} height={72} borderRadius={12} />
        ))}
      </div>

      {/* DiscoverFilters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <Skeleton variant="pill" width={110} height={36} />
        <Skeleton variant="pill" width={110} height={36} />
        <Skeleton variant="pill" width={110} height={36} />
      </div>

      {/* Sections */}
      {[0, 1, 2].map((s) => (
        <div key={s} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Skeleton variant="circle" width={40} height={40} />
            <div>
              <Skeleton variant="text" width={140} />
              <Skeleton variant="text" width={90} style={{ marginTop: 4 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} style={{ padding: 0 }}>
                <Skeleton width="100%" height={140} style={{ borderRadius: "12px 12px 0 0" }} />
                <div style={{ padding: 14 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" style={{ marginTop: 6 }} />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
