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

export default function ScraperTestPage() {
  const [state, setState] = useState<TestState>("idle");
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null); // keyed by url
  const [progress, setProgress] = useState(0);

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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Scraper Test</h1>
          <p className={styles.subtitle}>{totalUrls} URLs to test</p>
        </div>

        <div className={styles.headerActions}>
          {results.length > 0 && (
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
        </div>
      </div>

      {/* Progress bar */}
      {state === "running" && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(progress / totalUrls) * 100}%` }}
          />
        </div>
      )}

      {/* Stats */}
      {results.length > 0 && (
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
      {results.length > 0 && (
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

      {state === "idle" && (
        <div className={styles.emptyState}>
          <Play size={48} className={styles.emptyIcon} />
          <p>Click &quot;Start&quot; to begin scraping verification</p>
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
}: {
  result: ScrapeResult;
  isExpanded: boolean;
  onToggle: () => void;
  statusIcon: (s: string) => React.ReactNode;
  statusLabel: (s: string) => string;
}) {
  return (
    <>
      <tr
        className={`${styles.row} ${styles[`row_${result.status}`]} ${isExpanded ? styles.rowExpanded : ""}`}
        onClick={onToggle}
      >
        <td className={styles.td}>
          <span className={styles.siteName}>{getDomain(result.url)}</span>
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
