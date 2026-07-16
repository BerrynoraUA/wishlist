import type { BugReportStatus } from "@/api/types/bug-reports";

export type BugStatusFilter = BugReportStatus | "all";

/**
 * Order in which the status filter pills are rendered on the Bugs page.
 * "pending" is omitted: pending reports are not part of the public list.
 */
export const BUG_STATUS_FILTERS: readonly BugStatusFilter[] = [
  "all",
  "confirmed",
  "in_progress",
  "fixed",
] as const;

export const DEFAULT_BUG_STATUS_FILTER: BugStatusFilter = "all";

/**
 * Maximum characters accepted by the report-bug form.
 */
export const BUG_TITLE_MAX_LENGTH = 120;
export const BUG_DESCRIPTION_MAX_LENGTH = 1000;
