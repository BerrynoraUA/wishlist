"use client";

import { useGT } from "gt-next";
import { Code, CheckCircle, Sparkles } from "lucide-react";
import type { FeatureIdeaStatus } from "@/api/types/feature-ideas";
import styles from "../../ideas.module.scss";

export function StatusBadge({ status }: { status: FeatureIdeaStatus }) {
  const t = useGT();
  if (status === "approved") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
        <Sparkles size={12} />
        {t("Approved", { $id: "ideas.status.approved" })}
      </span>
    );
  }
  if (status === "in_development") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusInDev}`}>
        <Code size={12} />
        {t("In Development", { $id: "ideas.status.inDevelopment" })}
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusDone}`}>
        <CheckCircle size={12} />
        {t("Done", { $id: "ideas.status.done" })}
      </span>
    );
  }
  return null;
}
