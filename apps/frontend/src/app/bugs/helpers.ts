import type { BugReport } from "@/api/types/bug-reports";
import type { BugStatusFilter } from "./constants";

/**
 * Filter a list of bug reports by the status filter pill. "all" means no filter.
 */
export function filterBugsByStatus(reports: BugReport[], status: BugStatusFilter): BugReport[] {
  if (status === "all") return reports;
  return reports.filter((report) => report.status === status);
}
