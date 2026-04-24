"use client";

import { useMemo, useState } from "react";
import { useFeatureIdeas } from "@/hooks/use-feature-ideas";
import { DEFAULT_IDEA_STATUS_FILTER, type IdeaStatusFilter } from "../constants";
import { filterIdeasByStatus, sortIdeasByVotes } from "../helpers";

/**
 * Owns the Ideas page state: submit-modal flag, "just submitted" banner,
 * the active status-filter pill, and the derived sorted/filtered list.
 */
export function useIdeasPage() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IdeaStatusFilter>(DEFAULT_IDEA_STATUS_FILTER);

  const ideasQuery = useFeatureIdeas();
  const ideas = ideasQuery.data ?? [];

  const visibleIdeas = useMemo(
    () => sortIdeasByVotes(filterIdeasByStatus(ideas, statusFilter)),
    [ideas, statusFilter],
  );

  return {
    submitOpen,
    setSubmitOpen,
    submitted,
    setSubmitted,
    statusFilter,
    setStatusFilter,
    ideas,
    visibleIdeas,
    isLoading: ideasQuery.isLoading,
    isError: ideasQuery.isError,
  };
}
