"use client";

import Link from "next/link";
import { useGT } from "gt-next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button/Button";
import buttonStyles from "@/components/ui/Button/Button.module.scss";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useGT();
  const queryClient = useQueryClient();

  // reset() alone re-renders with the same cached data, so a page that threw
  // on that data would throw again. Dropping the cache makes the retry refetch.
  function retry() {
    void queryClient.resetQueries();
    reset();
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px" }}>
      <MascotEmptyState
        variant="empty-hands-shrug"
        message={t("Something went wrong on this page.", { $id: "error.page.message" })}
      />
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <Button onClick={retry}>{t("Try again", { $id: "error.page.retry" })}</Button>
        <Link
          href="/"
          className={`${buttonStyles.button} ${buttonStyles.secondary} ${buttonStyles.md}`}
        >
          {t("Go home", { $id: "error.page.home" })}
        </Link>
      </div>
    </main>
  );
}
