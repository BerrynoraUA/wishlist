import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export default function FriendsLoading() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {/* FriendsHeader */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Skeleton variant="heading" width={200} />
        <Skeleton variant="pill" width={140} height={40} />
      </div>

      {/* FriendsTabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Skeleton variant="pill" width={100} height={36} />
        <Skeleton variant="pill" width={100} height={36} />
        <Skeleton variant="pill" width={100} height={36} />
      </div>

      {/* FriendsGrid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Skeleton variant="circle" width={48} height={48} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" style={{ marginTop: 6 }} />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
