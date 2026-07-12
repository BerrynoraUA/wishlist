"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Clock,
  FileJson,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ShieldBan,
  CircleSlash2,
  Check,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { TEST_CASES } from "./test-urls";
import { exportScraperResultsExcel, exportScraperResultsJson } from "./export-scraper-results";
import { Button } from "@/components/ui/Button/Button";
import styles from "./scraper-test.module.scss";
import type {
  ApiScrapeResultRow,
  ScrapeResult,
  SortDir,
  SortField,
  StatusFilter,
  TestState,
} from "./constants";
import { STATUS_ORDER } from "./constants";
import { computeStatus, getDomain, validateResult } from "./helpers";

type ActiveTab = "suite" | "manual" | "unresolved";
type ManualState = "idle" | "scraping" | "saving" | "rerunning";

export default function ScraperTestPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("suite");
  const [state, setState] = useState<TestState>("idle");
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null); // keyed by url
  const [progress, setProgress] = useState(0);
  const [manualUrl, setManualUrl] = useState("");
  const [manualState, setManualState] = useState<ManualState>("idle");
  const [manualResult, setManualResult] = useState<ScrapeResult | null>(null);
  const [unresolvedResults, setUnresolvedResults] = useState<ScrapeResult[]>([]);
  const lastManualScrapeUrlRef = useRef("");
  const [manualMessage, setManualMessage] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("site");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const totalUrls = TEST_CASES.length;

  const successCount = results.filter((r) => r.status === "success").length;
  const partialCount = results.filter((r) => r.status === "partial").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const blockedCount = results.filter((r) => r.status === "blocked").length;
  const unavailableCount = results.filter((r) => r.status === "unavailable").length;

  const loadUnresolved = useCallback(async () => {
    const res = await fetch("/api/admin/scraper-test", {
      method: "GET",
      credentials: "include",
    });
    const json = (await res.json()) as {
      unresolved?: ScrapeResult[];
      error?: string;
    };

    if (!res.ok) {
      setManualMessage({
        kind: "error",
        text: json.error ?? `Could not load unresolved sites (HTTP ${res.status})`,
      });
      return;
    }

    setUnresolvedResults(json.unresolved ?? []);
  }, []);

  useEffect(() => {
    void loadUnresolved();
  }, [loadUnresolved]);

  const scrapeUrl = useCallback(async (url: string, autoRecord = false): Promise<ScrapeResult> => {
    const res = await fetch("/api/admin/scraper-test", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url], autoRecord }),
    });
    const json = (await res.json()) as {
      results?: ApiScrapeResultRow[];
      error?: string;
    };

    if (!res.ok) {
      return {
        url,
        status: "failed",
        data: null,
        error: json.error ?? `HTTP ${res.status}`,
        duration: 0,
        validations: [],
      };
    }

    const raw = json.results?.[0];
    if (!raw) {
      return {
        url,
        status: "failed",
        data: null,
        error: "Empty response",
        duration: 0,
        validations: [],
      };
    }

    return { ...raw, validations: [] };
  }, []);

  const runTest = useCallback(async () => {
    setState("running");
    setResults([]);
    setExpandedIdx(null);
    setProgress(0);

    const allResults: ScrapeResult[] = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];
      try {
        const res = await fetch("/api/admin/scraper-test", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [testCase.url] }),
        });
        const json = (await res.json()) as {
          results?: ApiScrapeResultRow[];
          error?: string;
        };
        if (!res.ok) {
          allResults.push({
            url: testCase.url,
            status: "failed",
            data: null,
            error: json.error ?? `HTTP ${res.status}`,
            duration: 0,
            validations: validateResult(testCase, null),
          });
          setResults([...allResults]);
          setProgress(i + 1);
          continue;
        }
        const raw = json.results?.[0];
        if (raw) {
          const validations = validateResult(testCase, raw.data);
          const status = computeStatus(raw.status, validations);
          allResults.push({ ...raw, status, validations });
        } else {
          allResults.push({
            url: testCase.url,
            status: "failed",
            data: null,
            error: "Empty response",
            duration: 0,
            validations: validateResult(testCase, null),
          });
        }
      } catch (err) {
        allResults.push({
          url: testCase.url,
          status: "failed",
          data: null,
          error: err instanceof Error ? err.message : "Network error",
          duration: 0,
          validations: validateResult(testCase, null),
        });
      }
      setResults([...allResults]);
      setProgress(i + 1);
    }

    setState("done");
  }, []);

  const runManualScrape = useCallback(
    async (url: string) => {
      setManualMessage(null);
      setManualState("scraping");
      try {
        const result = await scrapeUrl(url, true);
        setManualResult(result);
        setExpandedIdx(result.url);
        if (result.status === "blocked" || result.status === "failed") {
          void loadUnresolved();
        }
      } catch (error) {
        setManualMessage({
          kind: "error",
          text: error instanceof Error ? error.message : "Scrape failed.",
        });
      } finally {
        setManualState("idle");
      }
    },
    [scrapeUrl, loadUnresolved],
  );

  useEffect(() => {
    const url = manualUrl.trim();
    setManualMessage(null);

    if (!url) {
      lastManualScrapeUrlRef.current = "";
      setManualResult(null);
      return undefined;
    }

    try {
      new URL(url);
    } catch {
      return undefined;
    }

    if (url === lastManualScrapeUrlRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      lastManualScrapeUrlRef.current = url;
      void runManualScrape(url);
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [manualUrl, runManualScrape]);

  const approveResult = useCallback(
    async (result: ScrapeResult) => {
      if (!result.data) {
        setManualMessage({ kind: "error", text: "Cannot approve an empty scrape result." });
        return;
      }

      setManualState("saving");
      const res = await fetch("/api/admin/scraper-test", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url, data: result.data }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        setManualMessage({
          kind: res.status === 409 ? "info" : "error",
          text: json.error ?? `Could not approve result (HTTP ${res.status})`,
        });
        setManualState("idle");
        return;
      }

      setUnresolvedResults((current) => current.filter((item) => item.url !== result.url));
      if (manualResult?.url === result.url) setManualResult(null);
      setManualMessage({
        kind: "success",
        text: `${getDomain(result.url)} added to acceptance criteria.`,
      });
      setManualState("idle");
    },
    [manualResult?.url],
  );

  const saveUnresolvedResult = useCallback(async (result: ScrapeResult, comment?: string) => {
    const trimmedComment = comment?.trim();
    const unresolvedResult = {
      ...result,
      comment: trimmedComment || result.comment,
    };
    const res = await fetch("/api/admin/scraper-test", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: unresolvedResult }),
    });
    const json = (await res.json()) as {
      unresolved?: ScrapeResult[];
      error?: string;
    };

    if (!res.ok) {
      setManualMessage({
        kind: "error",
        text: json.error ?? `Could not save unresolved result (HTTP ${res.status})`,
      });
      return false;
    }

    setUnresolvedResults(json.unresolved ?? []);
    return true;
  }, []);

  const declineResult = useCallback(
    async (result: ScrapeResult, comment: string) => {
      const saved = await saveUnresolvedResult(result, comment);
      if (!saved) return;

      setManualResult(null);
      setManualMessage({
        kind: "info",
        text: `${getDomain(result.url)} moved to unresolved sites.`,
      });
      setActiveTab("unresolved");
    },
    [saveUnresolvedResult],
  );

  const removeUnresolvedResult = useCallback(async (result: ScrapeResult) => {
    const res = await fetch("/api/admin/scraper-test", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.url }),
    });
    const json = (await res.json()) as {
      unresolved?: ScrapeResult[];
      error?: string;
    };

    if (!res.ok) {
      setManualMessage({
        kind: "error",
        text: json.error ?? `Could not remove unresolved result (HTTP ${res.status})`,
      });
      return;
    }

    setUnresolvedResults(json.unresolved ?? []);
  }, []);

  const rerunUnresolved = useCallback(async () => {
    if (unresolvedResults.length === 0) return;

    setManualState("rerunning");
    setManualMessage(null);

    const updated: ScrapeResult[] = [];
    for (const result of unresolvedResults) {
      const nextResult = await scrapeUrl(result.url);
      const nextUnresolved = { ...nextResult, comment: result.comment };
      updated.push(nextUnresolved);
      setUnresolvedResults([...updated, ...unresolvedResults.slice(updated.length)]);
      await saveUnresolvedResult(nextUnresolved);
    }

    setUnresolvedResults(updated);
    setManualState("idle");
    setManualMessage({ kind: "success", text: "Unresolved sites rerun finished." });
  }, [saveUnresolvedResult, scrapeUrl, unresolvedResults]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...results];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => getDomain(r.url).toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Duration filter
    const minMs = durationMin ? Number(durationMin) : null;
    const maxMs = durationMax ? Number(durationMax) : null;
    if (minMs !== null && !isNaN(minMs)) {
      list = list.filter((r) => r.duration >= minMs);
    }
    if (maxMs !== null && !isNaN(maxMs)) {
      list = list.filter((r) => r.duration <= maxMs);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "site":
          cmp = getDomain(a.url).localeCompare(getDomain(b.url));
          break;
        case "status":
          cmp = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
          break;
        case "duration":
          cmp = a.duration - b.duration;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [results, searchQuery, statusFilter, durationMin, durationMax, sortField, sortDir]);

  const toggleExpand = (url: string) => {
    setExpandedIdx(expandedIdx === url ? null : url);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 size={14} className={styles.iconSuccess} />;
      case "partial":
        return <AlertTriangle size={14} className={styles.iconPartial} />;
      case "blocked":
        return <ShieldBan size={14} className={styles.iconBlocked} />;
      case "unavailable":
        return <CircleSlash2 size={14} className={styles.iconUnavailable} />;
      default:
        return <XCircle size={14} className={styles.iconFailed} />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Success";
      case "partial":
        return "Partial";
      case "blocked":
        return "Blocked";
      case "unavailable":
        return "Unavailable";
      default:
        return "Failed";
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className={styles.sortIconIdle} />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className={styles.sortIconActive} />
    ) : (
      <ArrowDown size={12} className={styles.sortIconActive} />
    );
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || durationMin !== "" || durationMax !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDurationMin("");
    setDurationMax("");
  };

  const exportFilenameBase = () =>
    `scraper-test-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "suite" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("suite")}
        >
          Test suite
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "manual" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("manual")}
        >
          Manual review
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "unresolved" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("unresolved")}
        >
          Unresolved
          {unresolvedResults.length > 0 && (
            <span className={styles.tabCount}>{unresolvedResults.length}</span>
          )}
        </button>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Scraper Test</h1>
          <p className={styles.subtitle}>
            {activeTab === "suite"
              ? `${totalUrls} URLs to test`
              : activeTab === "manual"
                ? "Scrape one product URL"
                : `${unresolvedResults.length} unresolved sites`}
          </p>
        </div>

        <div className={styles.headerActions}>
          {activeTab === "unresolved" && unresolvedResults.length > 0 && (
            <Button
              className={styles.secondaryBtn}
              onClick={rerunUnresolved}
              disabled={manualState === "rerunning"}
            >
              {manualState === "rerunning" ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Rerunning
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Rerun unresolved
                </>
              )}
            </Button>
          )}

          {activeTab === "suite" && results.length > 0 && (
            <>
              <ExportDropdown
                icon={<FileJson size={16} />}
                label="JSON"
                allCount={results.length}
                filteredCount={filteredAndSorted.length}
                hasActiveFilters={hasActiveFilters}
                onExportAll={() => exportScraperResultsJson(results, exportFilenameBase())}
                onExportFiltered={() =>
                  exportScraperResultsJson(filteredAndSorted, `${exportFilenameBase()}-filtered`)
                }
              />
              <ExportDropdown
                icon={<FileSpreadsheet size={16} />}
                label="Excel"
                allCount={results.length}
                filteredCount={filteredAndSorted.length}
                hasActiveFilters={hasActiveFilters}
                onExportAll={() => exportScraperResultsExcel(results, exportFilenameBase())}
                onExportFiltered={() =>
                  exportScraperResultsExcel(filteredAndSorted, `${exportFilenameBase()}-filtered`)
                }
              />
            </>
          )}

          {activeTab === "suite" && (
            <Button className={styles.runBtn} onClick={runTest} disabled={state === "running"}>
              {state === "running" ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  {progress}/{totalUrls}
                </>
              ) : (
                <>
                  <Play size={16} />
                  {state === "done" ? "Rerun" : "Start"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {activeTab === "suite" && state === "running" && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(progress / totalUrls) * 100}%` }}
          />
        </div>
      )}

      {/* Stats */}
      {activeTab === "suite" && results.length > 0 && (
        <div className={styles.stats}>
          <div className={`${styles.statCard} ${styles.statSuccess}`}>
            <CheckCircle2 size={16} />
            <strong>{successCount}</strong>
            <span>Success</span>
          </div>
          <div className={`${styles.statCard} ${styles.statPartial}`}>
            <AlertTriangle size={16} />
            <strong>{partialCount}</strong>
            <span>Partial</span>
          </div>
          <div className={`${styles.statCard} ${styles.statFailed}`}>
            <XCircle size={16} />
            <strong>{failedCount}</strong>
            <span>Failed</span>
          </div>
          <div className={`${styles.statCard} ${styles.statBlocked}`}>
            <ShieldBan size={16} />
            <strong>{blockedCount}</strong>
            <span>Blocked</span>
          </div>
          <div className={`${styles.statCard} ${styles.statUnavailable}`}>
            <CircleSlash2 size={16} />
            <strong>{unavailableCount}</strong>
            <span>Unavailable</span>
          </div>
          <div className={`${styles.statCard} ${styles.statTotal}`}>
            <Clock size={16} />
            <strong>
              {results.length}/{totalUrls}
            </strong>
            <span>Total</span>
          </div>
        </div>
      )}

      {/* Table */}
      {activeTab === "suite" && results.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {/* Site column header + filter */}
                <th className={styles.th}>
                  <button className={styles.thBtn} onClick={() => handleSort("site")}>
                    Site <SortIcon field="site" />
                  </button>
                  <div className={styles.filterCell}>
                    <div className={styles.searchWrap}>
                      <Search size={12} className={styles.searchIcon} />
                      <input
                        type="text"
                        className={styles.filterInput}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button className={styles.clearBtn} onClick={() => setSearchQuery("")}>
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </th>

                {/* Status column header + filter */}
                <th className={styles.th}>
                  <button className={styles.thBtn} onClick={() => handleSort("status")}>
                    Status <SortIcon field="status" />
                  </button>
                  <div className={styles.filterCell}>
                    <select
                      className={styles.filterSelect}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    >
                      <option value="all">All</option>
                      <option value="success">Success</option>
                      <option value="partial">Partial</option>
                      <option value="failed">Failed</option>
                      <option value="blocked">Blocked</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </th>

                {/* Duration column header + filter */}
                <th className={styles.th}>
                  <button className={styles.thBtn} onClick={() => handleSort("duration")}>
                    Time <SortIcon field="duration" />
                  </button>
                  <div className={styles.filterCell}>
                    <div className={styles.rangeFilter}>
                      <input
                        type="number"
                        className={styles.filterInputSm}
                        placeholder="Min"
                        value={durationMin}
                        onChange={(e) => setDurationMin(e.target.value)}
                        min={0}
                      />
                      <span className={styles.rangeSep}>–</span>
                      <input
                        type="number"
                        className={styles.filterInputSm}
                        placeholder="Max"
                        value={durationMax}
                        onChange={(e) => setDurationMax(e.target.value)}
                        min={0}
                      />
                    </div>
                  </div>
                </th>

                {/* Expand toggle column */}
                <th className={styles.thNarrow}>
                  {hasActiveFilters && (
                    <button
                      className={styles.clearAllBtn}
                      onClick={clearFilters}
                      title="Clear all filters"
                    >
                      <X size={12} /> Clear
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSorted.map((result) => (
                <ResultRow
                  key={result.url}
                  result={result}
                  isExpanded={expandedIdx === result.url}
                  onToggle={() => toggleExpand(result.url)}
                  statusIcon={statusIcon}
                  statusLabel={statusLabel}
                />
              ))}
              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>
                    No results match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "suite" && state === "idle" && (
        <div className={styles.emptyState}>
          <Play size={48} className={styles.emptyIcon} />
          <p>Click &quot;Start&quot; to begin scraping verification</p>
        </div>
      )}

      {activeTab === "manual" && (
        <div className={styles.manualPanel}>
          <div className={styles.manualForm}>
            <input
              type="url"
              className={styles.manualInput}
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="https://store.example/product"
            />
            <div className={styles.manualStatus}>
              {manualState === "scraping" && (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Scraping
                </>
              )}
            </div>
          </div>

          {manualMessage && (
            <div
              className={`${styles.manualMessage} ${styles[`manualMessage_${manualMessage.kind}`]}`}
            >
              {manualMessage.text}
            </div>
          )}

          {manualResult && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  <ResultRow
                    result={manualResult}
                    isExpanded={expandedIdx === manualResult.url}
                    onToggle={() => toggleExpand(manualResult.url)}
                    statusIcon={statusIcon}
                    statusLabel={statusLabel}
                    actions={
                      <ReviewActions
                        result={manualResult}
                        disabled={manualState === "saving"}
                        onApprove={() => void approveResult(manualResult)}
                        onDecline={(comment) => void declineResult(manualResult, comment)}
                        showComment
                      />
                    }
                  />
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "unresolved" && (
        <div className={styles.manualPanel}>
          {manualMessage && (
            <div
              className={`${styles.manualMessage} ${styles[`manualMessage_${manualMessage.kind}`]}`}
            >
              {manualMessage.text}
            </div>
          )}

          {unresolvedResults.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  {unresolvedResults.map((result) => (
                    <ResultRow
                      key={result.url}
                      result={result}
                      isExpanded={expandedIdx === result.url}
                      onToggle={() => toggleExpand(result.url)}
                      statusIcon={statusIcon}
                      statusLabel={statusLabel}
                      actions={
                        <ReviewActions
                          result={result}
                          disabled={manualState === "saving"}
                          onApprove={() => void approveResult(result)}
                          onDecline={() => void removeUnresolvedResult(result)}
                          declineLabel="Remove"
                        />
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <CheckCircle2 size={48} className={styles.emptyIcon} />
              <p>No unresolved sites</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Extracted row component ===== */
function ResultRow({
  result,
  isExpanded,
  onToggle,
  statusIcon,
  statusLabel,
  actions,
}: {
  result: ScrapeResult;
  isExpanded: boolean;
  onToggle: () => void;
  statusIcon: (s: string) => React.ReactNode;
  statusLabel: (s: string) => string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <tr
        className={`${styles.row} ${styles[`row_${result.status}`]} ${isExpanded ? styles.rowExpanded : ""}`}
        onClick={onToggle}
      >
        <td className={styles.td}>
          <span className={styles.siteName}>{getDomain(result.url)}</span>
          {typeof result.requestCount === "number" && (
            <span className={styles.requestCount} title="Requests">
              ×{result.requestCount}
            </span>
          )}
        </td>
        <td className={styles.td}>
          <span className={`${styles.badge} ${styles[`badge_${result.status}`]}`}>
            {statusIcon(result.status)}
            {statusLabel(result.status)}
          </span>
        </td>
        <td className={styles.td}>
          <span className={styles.duration}>{result.duration}ms</span>
        </td>
        <td className={styles.tdNarrow}>
          {isExpanded ? (
            <ChevronUp size={14} className={styles.chevron} />
          ) : (
            <ChevronDown size={14} className={styles.chevron} />
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr className={styles.expandRow}>
          <td colSpan={4} className={styles.expandCell}>
            <div className={styles.details}>
              {actions && (
                <div className={styles.reviewActions} onClick={(event) => event.stopPropagation()}>
                  {actions}
                </div>
              )}

              <div className={styles.detailUrl}>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.url}
                  <ExternalLink size={12} />
                </a>
              </div>

              {result.error && <div className={styles.errorMsg}>Error: {result.error}</div>}

              {(typeof result.requestCount === "number" || result.author) && (
                <div className={styles.metaRow}>
                  {typeof result.requestCount === "number" && (
                    <span className={styles.metaItem}>
                      <strong>Requests:</strong> {result.requestCount}
                    </span>
                  )}
                  {result.author && (
                    <span className={styles.metaItem}>
                      <strong>Reported by:</strong> {result.author}
                    </span>
                  )}
                </div>
              )}

              {result.comment && (
                <div className={styles.commentBox}>
                  <span>Comment:</span> {result.comment}
                </div>
              )}

              {result.diagnostics && <DiagnosticsDetails diagnostics={result.diagnostics} />}

              {result.validations.some((v) => v.match !== null) && (
                <div className={styles.validationGrid}>
                  <div className={styles.validationTitle}>Validation</div>
                  {result.validations
                    .filter((v) => v.match !== null)
                    .map((v) => (
                      <div
                        key={v.field}
                        className={`${styles.validationRow} ${v.match ? styles.validationMatch : styles.validationMismatch}`}
                      >
                        <span className={styles.validationIcon}>
                          {v.match ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </span>
                        <span className={styles.validationField}>{v.field}</span>
                        {!v.match && (
                          <div className={styles.validationDiff}>
                            <div className={styles.diffExpected}>
                              <span>Expected:</span> {v.expected == null ? "—" : String(v.expected)}
                            </div>
                            <div className={styles.diffActual}>
                              <span>Got:</span> {v.actual == null ? "—" : String(v.actual)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {result.missingFields && result.missingFields.length > 0 && (
                <div className={styles.missingFields}>
                  Missing: {result.missingFields.join(", ")}
                </div>
              )}

              {result.data && (
                <div className={styles.dataGrid}>
                  <DataRow label="Title" value={result.data.title} />
                  <DataRow label="Description" value={result.data.description} truncate />
                  <DataRow label="Image" value={result.data.image} isImage />
                  <DataRow label="Price" value={result.data.price} />
                  <DataRow label="Currency" value={result.data.currency} />
                  <DataRow label="Discount Price" value={result.data.discount_price} />
                  <DataRow label="Has Discount" value={result.data.has_discount ? "Yes" : "No"} />
                  <DataRow label="Discount End" value={result.data.discount_end_date} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ReviewActions({
  result,
  disabled,
  onApprove,
  onDecline,
  declineLabel = "Decline",
  showComment,
}: {
  result: ScrapeResult;
  disabled: boolean;
  onApprove: () => void;
  onDecline: (comment: string) => void;
  declineLabel?: string;
  showComment?: boolean;
}) {
  const [comment, setComment] = useState("");

  return (
    <div className={styles.reviewActionGroup}>
      {showComment && (
        <input
          className={styles.commentInput}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Decline comment"
        />
      )}
      <div className={styles.reviewActionButtons}>
        <Button
          className={styles.approveBtn}
          onClick={onApprove}
          disabled={disabled || !result.data}
        >
          <Check size={14} />
          Approve
        </Button>
        <Button
          className={styles.declineBtn}
          onClick={() => onDecline(comment)}
          disabled={disabled}
        >
          <ThumbsDown size={14} />
          {declineLabel}
        </Button>
      </div>
    </div>
  );
}

function DiagnosticsDetails({
  diagnostics,
}: {
  diagnostics: NonNullable<ScrapeResult["diagnostics"]>;
}) {
  const parserSources = Object.entries(diagnostics.parserSources);
  return (
    <div className={styles.diagnostics}>
      <div className={styles.validationTitle}>Scraping pipeline</div>
      <div className={styles.diagnosticsSummary}>
        <span>
          {diagnostics.engine === "legacy"
            ? "Next / legacy"
            : diagnostics.engine === "scrapling"
              ? "Scrapling"
              : diagnostics.engine === "official_api"
                ? "Official API"
                : "Internal API"}
        </span>
        {diagnostics.api && (
          <>
            <span>{diagnostics.api.provider}</span>
            <span>Adapter: {diagnostics.api.adapter}</span>
            {diagnostics.api.itemId && <span>Item: {diagnostics.api.itemId}</span>}
          </>
        )}
        <span>Stopped at: {diagnostics.fetchMethod}</span>
        {diagnostics.selectedFetchMethod && (
          <span>Best result: {diagnostics.selectedFetchMethod}</span>
        )}
        <span>{diagnostics.attempts.length} attempts</span>
      </div>
      <div className={styles.attemptTimeline}>
        {diagnostics.attempts.map((attempt) => (
          <div className={styles.attemptRow} key={`${attempt.sequence}-${attempt.mode}`}>
            <span className={styles.attemptSequence}>{attempt.sequence}</span>
            <div className={styles.attemptDetails}>
              <div className={styles.attemptHeading}>
                <strong>{attempt.mode}</strong>
                <span className={styles[`attempt_${attempt.outcome}`]}>{attempt.outcome}</span>
                {attempt.selected && <span className={styles.attemptSelected}>selected</span>}
              </div>
              <div className={styles.attemptMeta}>
                <span>{attempt.purpose}</span>
                <span>{attempt.durationMs}ms</span>
                {attempt.status !== undefined && <span>HTTP {attempt.status}</span>}
                {attempt.parseScore !== undefined && <span>score {attempt.parseScore}</span>}
              </div>
              {(attempt.blockReason || attempt.error) && (
                <div className={styles.attemptReason}>{attempt.blockReason ?? attempt.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {parserSources.length > 0 && (
        <div className={styles.sourceGrid}>
          <strong>Field</strong>
          <strong>Source</strong>
          <strong>Library</strong>
          {parserSources.map(([field, details]) => (
            <div className={styles.sourceRow} key={field}>
              <span>{field}</span>
              <span>{details.source}</span>
              <span>{details.library}</span>
            </div>
          ))}
        </div>
      )}
      {diagnostics.warnings && diagnostics.warnings.length > 0 && (
        <div className={styles.diagnosticWarnings}>Warnings: {diagnostics.warnings.join(", ")}</div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  truncate,
  isImage,
}: {
  label: string;
  value: string | null;
  truncate?: boolean;
  isImage?: boolean;
}) {
  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={`${styles.dataValue} ${!value ? styles.empty : ""}`}>
        {isImage && value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="product" className={styles.previewImg} />
            <span className={styles.imgUrl}>{value}</span>
          </a>
        ) : truncate && value && value.length > 200 ? (
          `${value.slice(0, 200)}…`
        ) : (
          (value ?? "—")
        )}
      </span>
    </div>
  );
}

function ExportDropdown({
  icon,
  label,
  allCount,
  filteredCount,
  hasActiveFilters,
  onExportAll,
  onExportFiltered,
}: {
  icon: React.ReactNode;
  label: string;
  allCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onExportAll: () => void;
  onExportFiltered: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleAll = () => {
    onExportAll();
    setOpen(false);
  };

  const handleFiltered = () => {
    onExportFiltered();
    setOpen(false);
  };

  return (
    <div className={styles.exportDropdown} ref={ref}>
      <button type="button" className={styles.exportBtn} onClick={() => setOpen((v) => !v)}>
        {icon}
        {label}
        <ChevronDown size={12} className={open ? styles.chevronOpen : ""} />
      </button>
      {open && (
        <div className={styles.exportMenu}>
          <button className={styles.exportMenuItem} onClick={handleAll}>
            All results ({allCount})
          </button>
          {hasActiveFilters && (
            <button className={styles.exportMenuItem} onClick={handleFiltered}>
              Filtered ({filteredCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
