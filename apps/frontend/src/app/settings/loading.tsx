import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";
import styles from "./settings.module.scss";

export default function SettingsLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Skeleton variant="heading" width={140} style={{ marginBottom: 24 }} />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="pill" width={100} height={36} />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          <SkeletonCard>
            <Skeleton variant="text" width="50%" />
            <Skeleton width="100%" height={40} style={{ marginTop: 12 }} borderRadius={8} />
            <Skeleton variant="text" width="50%" style={{ marginTop: 20 }} />
            <Skeleton width="100%" height={40} style={{ marginTop: 12 }} borderRadius={8} />
            <Skeleton variant="text" width="50%" style={{ marginTop: 20 }} />
            <Skeleton width="100%" height={80} style={{ marginTop: 12 }} borderRadius={8} />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
