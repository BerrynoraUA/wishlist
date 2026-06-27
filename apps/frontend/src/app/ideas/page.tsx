"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { ChevronUp, Info, Lightbulb, Clock, Code, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";
import { useToggleFeatureIdeaVote } from "@/hooks/use-feature-ideas";
import { StatusBadge } from "./components/status-badge/StatusBadge";
import { SubmitIdeaModal } from "./components/submit-idea-modal/SubmitIdeaModal";
import { useIdeasPage } from "./hooks/use-ideas-page";
import { IDEA_STATUS_FILTERS, type IdeaStatusFilter } from "./constants";
import { MascotEmptyState } from "@/components/ui/MascotEmptyState/MascotEmptyState";
import styles from "./ideas.module.scss";

export default function IdeasPage() {
  const t = useGT();
  const {
    submitOpen,
    setSubmitOpen,
    submitted,
    setSubmitted,
    statusFilter,
    setStatusFilter,
    ideas,
    visibleIdeas,
    isLoading,
    isError,
  } = useIdeasPage();
  const toggleVote = useToggleFeatureIdeaVote();
  const filterItems = useMemo<TabItem<IdeaStatusFilter>[]>(
    () =>
      IDEA_STATUS_FILTERS.map((filter) => ({
        value: filter,
        label:
          filter === "all" ? (
            <span className={styles.label}>All</span>
          ) : filter === "approved" ? (
            <>
              <Sparkles size={16} className={styles.filterIcon} />
              <span className={styles.label}>
                {t("Approved", { $id: "ideas.filter.approved" })}
              </span>
            </>
          ) : filter === "in_development" ? (
            <>
              <Code size={16} className={styles.filterIcon} />
              <span className={`${styles.label} ${styles.labelLong}`}>
                {t("In Development", { $id: "ideas.filter.inDevelopment" })}
              </span>
              <span className={`${styles.label} ${styles.labelShort}`}>In Dev</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} className={styles.filterIcon} />
              <span className={styles.label}>{t("Done", { $id: "ideas.filter.done" })}</span>
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
            <h1 className={styles.headerTitle}>
              {t("Feature Ideas", { $id: "ideas.page.title" })}
            </h1>
          </div>
          <div className={styles.submitButton}>
            <Button onClick={() => setSubmitOpen(true)}>
              <Lightbulb size={16} style={{ marginRight: 6 }} />
              {t("Submit Idea", { $id: "ideas.page.submitIdea" })}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.infoBanner}>
        <Info size={20} className={styles.infoIcon} />
        <p className={styles.infoText}>
          {t(
            "This is where you can share your feature ideas for this app. Other users can vote on them. If an idea gets enough support — we'll build it as soon as possible!",
            { $id: "ideas.page.infoBanner" },
          )}
        </p>
      </div>

      {submitted && (
        <div className={styles.pendingBanner}>
          <Clock size={18} className={styles.pendingIcon} />
          <p className={styles.pendingText}>
            {t(
              "Thanks! Your idea has been submitted and is awaiting review. It will appear here once approved.",
              { $id: "ideas.page.pendingBanner" },
            )}
          </p>
        </div>
      )}

      {isLoading && null}
      {isError && (
        <p className={styles.emptyState}>
          {t("Failed to load ideas.", { $id: "ideas.page.error" })}
        </p>
      )}

      {!isLoading && !isError && ideas.length === 0 && (
        <MascotEmptyState
          className={styles.emptyState}
          variant="lightbulb-idea"
          message={t("No ideas yet. Be the first to share one!", {
            $id: "ideas.page.empty",
          })}
        />
      )}

      <Tabs
        items={filterItems}
        active={statusFilter}
        onChange={setStatusFilter}
        as="nav"
        ariaLabel={t("Ideas status filters", { $id: "ideas.filter.nav" })}
        className={styles.filterTabs}
        tabClassName={styles.filterTab}
        activeTabClassName={styles.filterActive}
      />

      <div className={styles.ideaList}>
        {visibleIdeas.map((idea) => (
          <div key={idea.id} className={styles.ideaCard}>
            <div className={styles.voteSection}>
              <button
                type="button"
                className={`${styles.voteButton} ${idea.has_voted ? styles.voteButtonActive : ""}`}
                onClick={() => toggleVote.mutate(idea.id)}
              >
                <ChevronUp size={18} />
                {idea.votes_count}
              </button>
            </div>
            <div className={styles.ideaContent}>
              <div className={styles.ideaTitleRow}>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <StatusBadge status={idea.status} />
              </div>
              <p className={styles.ideaDescription}>{idea.description}</p>
              <div className={styles.ideaMeta}>
                {idea.user_avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={idea.user_avatar_url} alt="" className={styles.ideaAuthorAvatar} />
                )}
                <span>
                  {idea.user_display_name ?? t("Anonymous", { $id: "ideas.page.anonymous" })}
                </span>
                <span>·</span>
                <span>{new Date(idea.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SubmitIdeaModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => setSubmitted(true)}
      />
    </main>
  );
}
