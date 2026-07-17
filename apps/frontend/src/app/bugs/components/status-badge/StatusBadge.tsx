"use client";

import { useGT } from "gt-next";
import { AlertCircle, CheckCircle, Code } from "lucide-react";
import type { BugReportStatus } from "@/api/types/bug-reports";
import styles from "../../bugs.module.scss";

export function StatusBadge({ status }: { status: BugReportStatus }) {
  const t = useGT();
  if (status === "confirmed") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>
        <AlertCircle size={12} />
        {t("Confirmed", { $id: "bugs.status.confirmed" })}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusInProgress}`}>
        <Code size={12} />
        {t("In Progress", { $id: "bugs.status.inProgress" })}
      </span>
    );
  }
  if (status === "fixed") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusFixed}`}>
        <CheckCircle size={12} />
        {t("Fixed", { $id: "bugs.status.fixed" })}
      </span>
    );
  }
  return null;
}
