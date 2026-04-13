import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function IdeasLoading() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 64px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <Skeleton variant="heading" width={180} />
          <Skeleton variant="text" width={340} style={{ marginTop: 10 }} />
        </div>
        <Skeleton variant="pill" width={140} height={40} />
      </div>

      {/* Info banner */}
      <Skeleton width="100%" height={64} borderRadius={12} style={{ marginBottom: 28 }} />

      {/* Idea cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ display: "flex", gap: 16 }}>
            <Skeleton width={48} height={56} borderRadius={8} />
            <div style={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="80%" style={{ marginTop: 8 }} />
              <Skeleton variant="text" width="30%" style={{ marginTop: 10 }} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
