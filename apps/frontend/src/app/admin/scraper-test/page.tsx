"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { TEST_CASES, type TestCase } from "./test-urls";
import styles from "./scraper-test.module.scss";

interface ProductData {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
}

interface FieldValidation {
  field: string;
  expected: string | null;
  actual: string | null;
  match: boolean | null; // null = not validated (expected is null)
}

interface ScrapeResult {
  url: string;
  status: "success" | "partial" | "failed";
  data: ProductData | null;
  error?: string;
  missingFields?: string[];
  duration: number;
  validations: FieldValidation[];
}

type TestState = "idle" | "running" | "done";

function validateResult(
  testCase: TestCase,
  data: ProductData | null,
): FieldValidation[] {
  const fields: {
    field: string;
    key: keyof TestCase["expected"];
    dataKey: keyof ProductData;
  }[] = [
    { field: "Title", key: "title", dataKey: "title" },
    { field: "Price", key: "price", dataKey: "price" },
    { field: "Image", key: "image", dataKey: "image" },
    { field: "Description", key: "description", dataKey: "description" },
  ];

  return fields.map(({ field, key, dataKey }) => {
    const expected = testCase.expected[key];
    const actual = (data?.[dataKey] as string | null) ?? null;

    if (expected === null) {
      return { field, expected, actual, match: null };
    }

    return { field, expected, actual, match: expected === actual };
  });
}

function computeStatus(
  scraperStatus: "success" | "partial" | "failed",
  validations: FieldValidation[],
): "success" | "partial" | "failed" {
  if (scraperStatus === "failed") return "failed";

  const checked = validations.filter((v) => v.match !== null);
  if (checked.length === 0) return scraperStatus; // no expected values set, use scraper status
  const allMatch = checked.every((v) => v.match);
  if (allMatch) return "success";
  const someMatch = checked.some((v) => v.match);
  return someMatch ? "partial" : "failed";
}

export default function ScraperTestPage() {
  const [state, setState] = useState<TestState>("idle");
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const totalUrls = TEST_CASES.length;

  const successCount = results.filter((r) => r.status === "success").length;
  const partialCount = results.filter((r) => r.status === "partial").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [testCase.url] }),
        });
        const json = await res.json();
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

  const toggleExpand = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 size={18} className={styles.iconSuccess} />;
      case "partial":
        return <AlertTriangle size={18} className={styles.iconPartial} />;
      default:
        return <XCircle size={18} className={styles.iconFailed} />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Success";
      case "partial":
        return "Partial";
      default:
        return "Failed";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Scraper Test</h1>
          <p className={styles.subtitle}>{totalUrls} URLs to test</p>
        </div>

        <button
          className={styles.runBtn}
          onClick={runTest}
          disabled={state === "running"}
        >
          {state === "running" ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              Testing... {progress}/{totalUrls}
            </>
          ) : (
            <>
              <Play size={18} />
              {state === "done" ? "Run Again" : "Start Test"}
            </>
          )}
        </button>
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
            <CheckCircle2 size={20} />
            <div>
              <strong>{successCount}</strong>
              <span>Success</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statPartial}`}>
            <AlertTriangle size={20} />
            <div>
              <strong>{partialCount}</strong>
              <span>Partial</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statFailed}`}>
            <XCircle size={20} />
            <div>
              <strong>{failedCount}</strong>
              <span>Failed</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statTotal}`}>
            <Clock size={20} />
            <div>
              <strong>
                {results.length}/{totalUrls}
              </strong>
              <span>Total</span>
            </div>
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className={styles.grid}>
        {results.map((result, idx) => (
          <div
            key={idx}
            className={`${styles.resultCard} ${styles[`card_${result.status}`]}`}
          >
            <button
              className={styles.resultHeader}
              onClick={() => toggleExpand(idx)}
            >
              <div className={styles.resultLeft}>
                {statusIcon(result.status)}
                <div className={styles.resultInfo}>
                  <span className={styles.resultUrl} title={result.url}>
                    {getDomain(result.url)}
                  </span>
                  <span
                    className={`${styles.badge} ${styles[`badge_${result.status}`]}`}
                  >
                    {statusLabel(result.status)}
                  </span>
                </div>
              </div>
              <div className={styles.resultRight}>
                <span className={styles.duration}>{result.duration}ms</span>
                {expandedIdx === idx ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
            </button>

            {expandedIdx === idx && (
              <div className={styles.details}>
                <div className={styles.detailUrl}>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.url}
                    <ExternalLink size={12} />
                  </a>
                </div>

                {result.error && (
                  <div className={styles.errorMsg}>Error: {result.error}</div>
                )}

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
                            {v.match ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                          </span>
                          <span className={styles.validationField}>
                            {v.field}
                          </span>
                          {!v.match && (
                            <div className={styles.validationDiff}>
                              <div className={styles.diffExpected}>
                                <span>Expected:</span> {v.expected ?? "—"}
                              </div>
                              <div className={styles.diffActual}>
                                <span>Got:</span> {v.actual ?? "—"}
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
                    <DataRow
                      label="Description"
                      value={result.data.description}
                      truncate
                    />
                    <DataRow label="Image" value={result.data.image} isImage />
                    <DataRow label="Price" value={result.data.price} />
                    <DataRow label="Currency" value={result.data.currency} />
                    <DataRow
                      label="Discount Price"
                      value={result.data.discount_price}
                    />
                    <DataRow
                      label="Has Discount"
                      value={result.data.has_discount ? "Yes" : "No"}
                    />
                    <DataRow
                      label="Discount End"
                      value={result.data.discount_end_date}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {state === "idle" && (
        <div className={styles.emptyState}>
          <Play size={48} className={styles.emptyIcon} />
          <p>Click &quot;Start Test&quot; to begin scraping verification</p>
        </div>
      )}
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
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
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.imageLink}
          >
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
