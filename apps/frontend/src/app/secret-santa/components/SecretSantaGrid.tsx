"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { SecretSantaEventCard } from "./SecretSantaEventCard";
import styles from "./SecretSantaGrid.module.scss";
import { useSecretSantaEvents } from "@/hooks/use-secret-santa";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton/Skeleton";

const PAGE_SIZE = 8;

export function SecretSantaGrid() {
  const t = useGT();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useSecretSantaEvents({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const events = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h2 className={styles.title}>{t("Your Events", { $id: "secretSanta.grid.title" })}</h2>
      <div className={styles.grid}>
        {isLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i}>
                <Skeleton variant="heading" width="70%" />
                <Skeleton variant="text" width="40%" style={{ marginTop: 10 }} />
              </SkeletonCard>
            ))}
          </>
        )}
        {isError && (
          <p>
            {t("Failed to load events.", {
              $id: "secretSanta.grid.loadError",
            })}
          </p>
        )}
        {!isLoading && !isError && events.length === 0 && (
          <p className={styles.empty}>
            {t("No Secret Santa events yet. Create one to get started!", {
              $id: "secretSanta.grid.empty",
            })}
          </p>
        )}
        {events.map((event) => (
          <SecretSantaEventCard key={event.id} event={event} />
        ))}
      </div>

      {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} />}
    </div>
  );
}
