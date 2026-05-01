import type { FeatureIdeaStatus } from "@/api/types/feature-ideas";

export type IdeaStatusFilter = FeatureIdeaStatus | "all";

/**
 * Order in which the status filter pills are rendered on the Ideas page.
 */
export const IDEA_STATUS_FILTERS: readonly IdeaStatusFilter[] = [
  "all",
  "approved",
  "in_development",
  "done",
] as const;

export const DEFAULT_IDEA_STATUS_FILTER: IdeaStatusFilter = "all";

/**
 * Maximum characters accepted by the submit-idea form.
 */
export const IDEA_TITLE_MAX_LENGTH = 120;
export const IDEA_DESCRIPTION_MAX_LENGTH = 1000;
