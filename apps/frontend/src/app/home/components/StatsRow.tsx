"use client";

import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { StatCard } from "./StatCard";
import styles from "./StatsRow.module.scss";
import { useMyStatistics } from "@/hooks/use-user";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton/Skeleton";

export function StatsRow() {
  const t = useGT();
  const router = useRouter();
  const { data, isLoading, isError } = useMyStatistics();

  if (isLoading) {
    return (
      <div className={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton variant="text" width={100} />
            <Skeleton variant="heading" width={60} style={{ marginTop: 12 }} />
          </SkeletonCard>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.row}>{t("Failed to load stats.", { $id: "home.stats.error" })}</div>
    );
  }

  const stats = [
    {
      label: t("Wishlists", { $id: "home.stats.label.wishlists" }),
      value: data.wishlists_count,
    },
    {
      label: t("Total Items", { $id: "home.stats.label.totalItems" }),
      value: data.total_items_count,
    },
    {
      label: t("Reserved", { $id: "home.stats.label.reserved" }),
      value: data.reserved_items_count,
      onClick: () => router.push("/discover?tab=reserved"),
    },
    {
      label: t("Purchased", { $id: "home.stats.label.purchased" }),
      value: data.purchased_items_count,
      onClick: () => router.push("/discover?tab=purchased"),
    },
  ];

  return (
    <div className={styles.row}>
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} onClick={stat.onClick} />
      ))}
    </div>
  );
}
