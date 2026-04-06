import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";
import { SecretSantaPageShell } from "@/app/secret-santa/components/SecretSantaPageShell";

export default function SecretSantaDetailLoading() {
  return (
    <SecretSantaPageShell>
      <div>
        {/* Back link */}
        <Skeleton variant="text" width={120} style={{ marginBottom: 20 }} />

        {/* Hero banner */}
        <Skeleton width="100%" height={180} borderRadius={16} style={{ marginBottom: 28 }} />

        {/* People section */}
        <div style={{ marginBottom: 32 }}>
          <Skeleton variant="heading" width={160} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width={280} style={{ marginBottom: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Skeleton variant="circle" width={40} height={40} />
                  <div style={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="25%" style={{ marginTop: 4 }} />
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>

        {/* Gift suggestions */}
        <div>
          <Skeleton variant="heading" width={180} style={{ marginBottom: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} style={{ padding: 0 }}>
                <Skeleton width="100%" height={120} style={{ borderRadius: "12px 12px 0 0" }} />
                <div style={{ padding: 14 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="35%" style={{ marginTop: 6 }} />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </div>
    </SecretSantaPageShell>
  );
}
