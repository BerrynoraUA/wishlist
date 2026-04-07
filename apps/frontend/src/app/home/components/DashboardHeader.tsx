"use client";

import { Button } from "@/components/ui/Button/Button";
import styles from "./DashboardHeader.module.scss";
import { Plus } from "lucide-react";
import { useCurrentUser, useMyStatistics } from "@/hooks/use-user";

function getDisplayName(nameSource?: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const metadata = (nameSource?.user_metadata ?? {}) as Record<string, unknown>;

  const rawFull = metadata.full_name ?? metadata.name;
  const rawFirst = metadata.first_name;
  const rawLast = metadata.last_name;

  const fullName =
    (typeof rawFull === "string" && rawFull) ||
    [
      typeof rawFirst === "string" ? rawFirst : undefined,
      typeof rawLast === "string" ? rawLast : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (fullName) return fullName;
  if (nameSource?.email) return nameSource.email.split("@")[0];
  return "there";
}

type Props = {
  onNewWishlist: () => void;
};

export function DashboardHeader({ onNewWishlist }: Props) {
  const { data: user } = useCurrentUser();
  const { data: stats } = useMyStatistics();
  const displayName = getDisplayName(user ?? undefined);

  void stats;

  return (
    <div className={styles.header}>
      <div>
        <h1>Good afternoon, {displayName}</h1>
        <p>
          Manage your wishlists and discover what your friends are wishing for.
        </p>
      </div>

      <div className={styles.actions}>
        <Button size="sm" onClick={onNewWishlist}>
          <Plus size={18} />
          <span>Add Wishlist</span>
        </Button>
      </div>
    </div>
  );
}
