import { createFeatureIdeasApi } from "@wishlist/backend/api/feature-ideas";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const { createFeatureIdea, getApprovedFeatureIdeas, toggleFeatureIdeaVote } =
  createFeatureIdeasApi(supabaseBrowser);
