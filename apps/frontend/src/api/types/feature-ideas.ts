export type FeatureIdeaStatus =
  | "pending"
  | "approved"
  | "in_development"
  | "done";

export interface FeatureIdea {
  id: string;
  title: string;
  description: string;
  user_id: string;
  status: FeatureIdeaStatus;
  votes_count: number;
  has_voted: boolean;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

export interface CreateFeatureIdeaParams {
  title: string;
  description: string;
}
