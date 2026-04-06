import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "./login.module.scss";

export default function LoginLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        {/* LoginHeader */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Skeleton variant="heading" width={160} style={{ margin: "0 auto" }} />
          <Skeleton variant="text" width={240} style={{ margin: "10px auto 0" }} />
        </div>

        {/* LoginTabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Skeleton variant="pill" width="50%" height={40} />
          <Skeleton variant="pill" width="50%" height={40} />
        </div>

        {/* AuthForm card */}
        <div className={styles.cardWrap}>
          <Skeleton width="100%" height={40} borderRadius={8} />
          <Skeleton width="100%" height={40} borderRadius={8} style={{ marginTop: 16 }} />
          <Skeleton variant="pill" width="100%" height={44} style={{ marginTop: 24 }} />
          <Skeleton variant="text" width={180} style={{ margin: "16px auto 0" }} />
        </div>
      </div>
    </main>
  );
}
