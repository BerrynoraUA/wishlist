import type { BugReport, BugReportStatus } from "@wishlist/backend/types/bug-reports";

export type BugStatusFilter = Exclude<BugReportStatus, "pending"> | "all";

export const BUG_STATUS_FILTERS: readonly BugStatusFilter[] = [
  "all",
  "confirmed",
  "in_progress",
  "fixed",
] as const;

export const DEFAULT_BUG_STATUS_FILTER: BugStatusFilter = "all";
export const BUG_TITLE_MAX_LENGTH = 120;
export const BUG_DESCRIPTION_MAX_LENGTH = 1000;

export function filterBugsByStatus(reports: BugReport[], status: BugStatusFilter): BugReport[] {
  if (status === "all") return reports;
  return reports.filter((report) => report.status === status);
}
