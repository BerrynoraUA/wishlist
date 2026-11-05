"use client";

import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Gift, Lock, Package, ShoppingBag } from "lucide-react";
import { StatCard } from "../stat-card/StatCard";
import styles from "./StatsRow.module.scss";
import { useMyStatistics } from "@/hooks/use-user";
import { StatsRowSkeleton } from "../home-skeleton/HomeSkeleton";

export function StatsRow() {
  const t = useGT();
  const router = useRouter();
  const { data, isLoading, isError } = useMyStatistics();

  if (isLoading) {
    return <StatsRowSkeleton />;
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
      icon: Gift,
    },
    {
      label: t("Total Items", { $id: "home.stats.label.totalItems" }),
      value: data.total_items_count,
      icon: Package,
    },
    {
      label: t("Reserved", { $id: "home.stats.label.reserved" }),
      value: data.reserved_items_count,
      icon: Lock,
      onClick: () => router.push("/discover?tab=reserved"),
    },
    {
      label: t("Purchased", { $id: "home.stats.label.purchased" }),
      value: data.purchased_items_count,
      icon: ShoppingBag,
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
          icon={stat.icon}
          onClick={stat.onClick}
        />
      ))}
    </div>
  );
}
