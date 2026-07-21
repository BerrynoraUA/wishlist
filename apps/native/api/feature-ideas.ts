import { createFeatureIdeasApi } from "@wishlist/backend/api/feature-ideas";
import { supabase } from "@wishlist/backend/supabase/native";

export const { createFeatureIdea, getApprovedFeatureIdeas, toggleFeatureIdeaVote } =
  createFeatureIdeasApi(supabase);
