"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { AlertCircle, Bug, CheckCircle, Clock, Code, Info } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";
import { StatusBadge } from "./components/status-badge/StatusBadge";
import { ReportBugModal } from "./components/report-bug-modal/ReportBugModal";
import { useBugsPage } from "./hooks/use-bugs-page";
import { BUG_STATUS_FILTERS, type BugStatusFilter } from "./constants";
import styles from "./bugs.module.scss";

export default function BugsPage() {
  const t = useGT();
  const {
    reportOpen,
    setReportOpen,
    submitted,
    setSubmitted,
    statusFilter,
    setStatusFilter,
    reports,
    visibleReports,
    isLoading,
    isError,
  } = useBugsPage();
  const filterItems = useMemo<TabItem<BugStatusFilter>[]>(
    () =>
      BUG_STATUS_FILTERS.map((filter) => ({
        value: filter,
        label:
          filter === "all" ? (
            <span className={styles.label}>All</span>
          ) : filter === "confirmed" ? (
            <>
              <AlertCircle size={16} className={styles.filterIcon} />
              <span className={styles.label}>
                {t("Confirmed", { $id: "bugs.filter.confirmed" })}
              </span>
            </>
          ) : filter === "in_progress" ? (
            <>
              <Code size={16} className={styles.filterIcon} />
              <span className={`${styles.label} ${styles.labelLong}`}>
                {t("In Progress", { $id: "bugs.filter.inProgress" })}
              </span>
              <span className={`${styles.label} ${styles.labelShort}`}>In Dev</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} className={styles.filterIcon} />
              <span className={styles.label}>{t("Fixed", { $id: "bugs.filter.fixed" })}</span>
            </>
          ),
      })),
    [t],
  );

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.headerTitle}>{t("Bug Reports", { $id: "bugs.page.title" })}</h1>
          </div>
          <div className={styles.submitButton}>
            <Button onClick={() => setReportOpen(true)}>
              <Bug size={16} style={{ marginRight: 6 }} />
              {t("Report a Bug", { $id: "bugs.page.reportBug" })}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.infoBanner}>
        <Info size={20} className={styles.infoIcon} />
        <p className={styles.infoText}>
          {t(
            "Found something broken? Report it here. Once we confirm a bug it shows up on this board, so you can follow along as we work through it.",
            { $id: "bugs.page.infoBanner" },
          )}
        </p>
      </div>

      {submitted && (
        <div className={styles.pendingBanner}>
          <Clock size={18} className={styles.pendingIcon} />
          <p className={styles.pendingText}>
            {t(
              "Thanks! Your report has been submitted and is awaiting review. It will appear here once confirmed.",
              { $id: "bugs.page.pendingBanner" },
            )}
          </p>
        </div>
      )}

      <Tabs
        items={filterItems}
        active={statusFilter}
        onChange={setStatusFilter}
        as="nav"
        ariaLabel={t("Bug status filters", { $id: "bugs.filter.nav" })}
        className={styles.filterTabs}
        tabClassName={styles.filterTab}
        activeTabClassName={styles.filterActive}
      />

      {isLoading && null}
      {isError && (
        <p className={styles.emptyState}>
          {t("Failed to load bug reports.", { $id: "bugs.page.error" })}
        </p>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <MascotEmptyState
          className={styles.emptyState}
          variant="magnifying-glass"
          message={t("No known bugs right now. If you spot one, let us know!", {
            $id: "bugs.page.empty",
          })}
        />
      )}

      <div className={styles.bugList}>
        {visibleReports.map((report) => (
          <div key={report.id} className={styles.bugCard}>
            <div className={styles.bugContent}>
              <div className={styles.bugTitleRow}>
                <h3 className={styles.bugTitle}>{report.title}</h3>
                <StatusBadge status={report.status} />
              </div>
              <p className={styles.bugDescription}>{report.description}</p>

              {report.screenshot_url && (
                <a
                  href={report.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.bugScreenshotLink}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.screenshot_url}
                    alt={t("Screenshot for {title}", {
                      $id: "bugs.page.screenshotAlt",
                      title: report.title,
                    })}
                    className={styles.bugScreenshot}
                    loading="lazy"
                  />
                </a>
              )}

              <div className={styles.bugMeta}>
                {report.user_avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={report.user_avatar_url} alt="" className={styles.bugAuthorAvatar} />
                )}
                <span>
                  {report.user_display_name ?? t("Anonymous", { $id: "bugs.page.anonymous" })}
                </span>
                <span>·</span>
                <span>{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ReportBugModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => setSubmitted(true)}
      />
    </main>
  );
}
