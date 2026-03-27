"use client";

import { useRouter } from "next/navigation";
import { StatCard } from "./StatCard";
import styles from "./StatsRow.module.scss";
import { useMyStatistics } from "@/hooks/use-user";

export function StatsRow() {
  const router = useRouter();
  const { data, isLoading, isError } = useMyStatistics();

  if (isLoading) {
    return <div className={styles.row}>Loading stats...</div>;
  }

  if (isError || !data) {
    return <div className={styles.row}>Failed to load stats.</div>;
  }

  const stats = [
    { label: "Wishlists", value: data.wishlists_count },
    { label: "Total Items", value: data.total_items_count },
    {
      label: "Reserved",
      value: data.reserved_items_count,
      onClick: () => router.push("/discover?tab=reserved"),
    },
    {
      label: "Purchased",
      value: data.purchased_items_count,
      onClick: () => router.push("/discover?tab=purchased"),
    },
  ];

  return (
    <div className={styles.row}>
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          onClick={stat.onClick}
        />
      ))}
    </div>
  );
}
