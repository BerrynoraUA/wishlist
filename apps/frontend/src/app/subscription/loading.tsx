import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function SubscriptionLoading() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {/* SubscriptionHeader */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Skeleton variant="heading" width={280} style={{ margin: "0 auto" }} />
        <Skeleton variant="text" width={360} style={{ margin: "12px auto 0" }} />
      </div>

      {/* PricingCards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
          marginBottom: 48,
        }}
      >
        {[0, 1].map((i) => (
          <SkeletonCard key={i} style={{ padding: 32 }}>
            <Skeleton variant="text" width={80} />
            <Skeleton variant="heading" width={120} style={{ marginTop: 12 }} />
            <Skeleton variant="text" width="80%" style={{ marginTop: 8 }} />
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} variant="text" width="70%" />
              ))}
            </div>
            <Skeleton variant="pill" width="100%" height={44} style={{ marginTop: 24 }} />
          </SkeletonCard>
        ))}
      </div>

      {/* FeatureComparison */}
      <SkeletonCard style={{ marginBottom: 32 }}>
        <Skeleton variant="heading" width={200} style={{ marginBottom: 20 }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <Skeleton variant="text" width="40%" />
            <div style={{ display: "flex", gap: 48 }}>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="text" width={60} />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </main>
  );
}
