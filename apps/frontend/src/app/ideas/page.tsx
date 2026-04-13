"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import {
  ChevronUp,
  Info,
  Lightbulb,
  Clock,
  Code,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import {
  useFeatureIdeas,
  useCreateFeatureIdea,
  useToggleFeatureIdeaVote,
} from "@/hooks/use-feature-ideas";
import type { FeatureIdeaStatus } from "@/api/types/feature-ideas";
import styles from "./ideas.module.scss";

export default function IdeasPage() {
  const t = useGT();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FeatureIdeaStatus | "all">("all");
  const { data: ideas = [], isLoading, isError } = useFeatureIdeas();
  const toggleVote = useToggleFeatureIdeaVote();

  const filteredIdeas = useMemo(() => {
    if (statusFilter === "all") return ideas;
    return ideas.filter((idea) => idea.status === statusFilter);
  }, [ideas, statusFilter]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.headerTitle}>
              {t("Feature Ideas", { $id: "ideas.page.title" })}
            </h1>
            <p className={styles.headerDescription}>
              {t(
                "Vote on ideas you love or submit your own. The most popular ideas get built first!",
                { $id: "ideas.page.description" },
              )}
            </p>
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
        <p className={styles.emptyState}>
          {t("No ideas yet. Be the first to share one!", {
            $id: "ideas.page.empty",
          })}
        </p>
      )}

      <div className={styles.filterBar}>
        {(["all", "approved", "in_development", "done"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterPill} ${statusFilter === f ? styles.filterActive : ""}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === "all" && t("All", { $id: "ideas.filter.all" })}
            {f === "approved" && (
              <>
                <Sparkles size={12} />
                {t("Approved", { $id: "ideas.filter.approved" })}
              </>
            )}
            {f === "in_development" && (
              <>
                <Code size={12} />
                {t("In Development", { $id: "ideas.filter.inDevelopment" })}
              </>
            )}
            {f === "done" && (
              <>
                <CheckCircle size={12} />
                {t("Done", { $id: "ideas.filter.done" })}
              </>
            )}
          </button>
        ))}
      </div>

      <div className={styles.ideaList}>
        {filteredIdeas
          .sort((a, b) => b.votes_count - a.votes_count)
          .map((idea) => (
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
                    <img
                      src={idea.user_avatar_url}
                      alt=""
                      className={styles.ideaAuthorAvatar}
                    />
                  )}
                  <span>
                    {idea.user_display_name ??
                      t("Anonymous", { $id: "ideas.page.anonymous" })}
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

function StatusBadge({ status }: { status: FeatureIdeaStatus }) {
  const t = useGT();
  if (status === "approved") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
        <Sparkles size={12} />
        {t("Approved", { $id: "ideas.status.approved" })}
      </span>
    );
  }
  if (status === "in_development") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusInDev}`}>
        <Code size={12} />
        {t("In Development", { $id: "ideas.status.inDevelopment" })}
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className={`${styles.statusBadge} ${styles.statusDone}`}>
        <CheckCircle size={12} />
        {t("Done", { $id: "ideas.status.done" })}
      </span>
    );
  }
  return null;
}

function SubmitIdeaModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const t = useGT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createIdea = useCreateFeatureIdea();

  function handleSubmit() {
    if (!title.trim() || !description.trim() || createIdea.isPending) return;
    createIdea.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          onClose();
          onSubmitted();
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Submit a Feature Idea", { $id: "ideas.modal.title" })}
    >
      <div className={styles.form}>
        <label className={styles.fieldLabel}>
          {t("Title", { $id: "ideas.modal.titleLabel" })}
          <input
            className={styles.fieldInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("e.g. Dark mode calendar view", {
              $id: "ideas.modal.titlePlaceholder",
            })}
            maxLength={120}
          />
        </label>

        <label className={styles.fieldLabel}>
          {t("Description", { $id: "ideas.modal.descriptionLabel" })}
          <textarea
            className={styles.fieldTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Describe your idea and why it would be useful...", {
              $id: "ideas.modal.descriptionPlaceholder",
            })}
            maxLength={1000}
          />
        </label>

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "ideas.modal.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !title.trim() || !description.trim() || createIdea.isPending
            }
          >
            {createIdea.isPending
              ? t("Submitting...", { $id: "ideas.modal.submitting" })
              : t("Submit", { $id: "ideas.modal.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
