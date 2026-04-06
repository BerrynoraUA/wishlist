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
import { TEST_URLS } from "./test-urls";
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

interface ScrapeResult {
  url: string;
  status: "success" | "partial" | "failed";
  data: ProductData | null;
  error?: string;
  missingFields?: string[];
  duration: number;
}

type TestState = "idle" | "running" | "done";

export default function ScraperTestPage() {
  const [state, setState] = useState<TestState>("idle");
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const totalUrls = TEST_URLS.length;

  const successCount = results.filter((r) => r.status === "success").length;
  const partialCount = results.filter((r) => r.status === "partial").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  const runTest = useCallback(async () => {
    setState("running");
    setResults([]);
    setExpandedIdx(null);
    setProgress(0);

    // Скрапимо по одному щоб мати прогрес в реальному часі
    const allResults: ScrapeResult[] = [];

    for (let i = 0; i < TEST_URLS.length; i++) {
      const url = TEST_URLS[i];
      try {
        const res = await fetch("/api/admin/scraper-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [url] }),
        });
        const json = await res.json();
        if (json.results?.[0]) {
          allResults.push(json.results[0]);
        } else {
          allResults.push({ url, status: "failed", data: null, error: "Empty response", duration: 0 });
        }
      } catch (err) {
        allResults.push({
          url,
          status: "failed",
          data: null,
          error: err instanceof Error ? err.message : "Network error",
          duration: 0,
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
          <p className={styles.subtitle}>
            {totalUrls} URLs to test
          </p>
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
              <strong>{results.length}/{totalUrls}</strong>
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
                  <span className={`${styles.badge} ${styles[`badge_${result.status}`]}`}>
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
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    {result.url}
                    <ExternalLink size={12} />
                  </a>
                </div>

                {result.error && (
                  <div className={styles.errorMsg}>
                    Error: {result.error}
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
          <a href={value} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="product" className={styles.previewImg} />
            <span className={styles.imgUrl}>{value}</span>
          </a>
        ) : truncate && value && value.length > 200 ? (
          `${value.slice(0, 200)}…`
        ) : (
          value ?? "—"
        )}
      </span>
    </div>
  );
}
