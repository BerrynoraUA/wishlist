import type { FeatureIdea } from "@/api/types/feature-ideas";
import type { IdeaStatusFilter } from "./constants";

/**
 * Filter a list of ideas by the status filter pill. "all" means no filter.
 */
export function filterIdeasByStatus(ideas: FeatureIdea[], status: IdeaStatusFilter): FeatureIdea[] {
  if (status === "all") return ideas;
  return ideas.filter((idea) => idea.status === status);
}

/**
 * Return a copy of the ideas sorted by votes descending.
 */
export function sortIdeasByVotes(ideas: FeatureIdea[]): FeatureIdea[] {
  return [...ideas].sort((a, b) => b.votes_count - a.votes_count);
}
