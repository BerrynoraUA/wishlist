import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "../login/login.module.scss";

export default function RegisterLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.visual} />

      <div className={styles.formSide}>
        <div className={styles.formContent}>
          <div className={styles.formHeader}>
            <Skeleton variant="pill" width={160} height={28} />
            <Skeleton variant="heading" width={240} style={{ marginTop: 16 }} />
            <Skeleton variant="text" width={320} style={{ marginTop: 8 }} />
          </div>

          <Skeleton width="100%" height={44} borderRadius={12} />
          <Skeleton width="100%" height={44} borderRadius={12} style={{ marginTop: 12 }} />
          <Skeleton variant="pill" width="100%" height={48} style={{ marginTop: 20 }} />
          <Skeleton variant="text" width={200} style={{ margin: "24px auto 0" }} />
        </div>
      </div>
    </main>
  );
}
