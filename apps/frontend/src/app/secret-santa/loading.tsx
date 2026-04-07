import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";
import { SecretSantaPageShell } from "./components/SecretSantaPageShell";

export default function SecretSantaLoading() {
  return (
    <SecretSantaPageShell>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <Skeleton variant="heading" width={220} />
          <Skeleton variant="text" width={160} style={{ marginTop: 8 }} />
        </div>
        <Skeleton variant="pill" width={160} height={44} />
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" style={{ marginTop: 8 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Skeleton variant="circle" width={32} height={32} />
              <Skeleton variant="circle" width={32} height={32} />
              <Skeleton variant="circle" width={32} height={32} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SecretSantaPageShell>
  );
}
