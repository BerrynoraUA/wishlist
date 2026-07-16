"use client";

import { useMemo, useState } from "react";
import { useBugReports } from "@/hooks/use-bug-reports";
import { DEFAULT_BUG_STATUS_FILTER, type BugStatusFilter } from "../constants";
import { filterBugsByStatus } from "../helpers";

/**
 * Owns the Bugs page state: report-modal flag, "just submitted" banner,
 * the active status-filter pill, and the derived filtered list.
 * The list arrives newest-first from the RPC, so no client-side sort is needed.
 */
export function useBugsPage() {
  const [reportOpen, setReportOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BugStatusFilter>(DEFAULT_BUG_STATUS_FILTER);

  const reportsQuery = useBugReports();
  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const visibleReports = useMemo(
    () => filterBugsByStatus(reports, statusFilter),
    [reports, statusFilter],
  );

  return {
    reportOpen,
    setReportOpen,
    submitted,
    setSubmitted,
    statusFilter,
    setStatusFilter,
    reports,
    visibleReports,
    isLoading: reportsQuery.isLoading,
    isError: reportsQuery.isError,
  };
}
