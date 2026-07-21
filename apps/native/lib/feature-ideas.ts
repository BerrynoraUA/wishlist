import type { FeatureIdea, FeatureIdeaStatus } from "@wishlist/backend/types/feature-ideas";

export type IdeaStatusFilter = FeatureIdeaStatus | "all";

export const IDEA_STATUS_FILTERS: readonly IdeaStatusFilter[] = [
  "all",
  "approved",
  "in_development",
  "done",
] as const;

export const DEFAULT_IDEA_STATUS_FILTER: IdeaStatusFilter = "all";
export const IDEA_TITLE_MAX_LENGTH = 120;
export const IDEA_DESCRIPTION_MAX_LENGTH = 1000;

export function filterIdeasByStatus(ideas: FeatureIdea[], status: IdeaStatusFilter): FeatureIdea[] {
  if (status === "all") return ideas;
  return ideas.filter((idea) => idea.status === status);
}

export function sortIdeasByVotes(ideas: FeatureIdea[]): FeatureIdea[] {
  return [...ideas].sort((a, b) => b.votes_count - a.votes_count);
}
