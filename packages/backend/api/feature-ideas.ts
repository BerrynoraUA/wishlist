import type { WishlistSupabaseClient } from "../supabase/types";
import type { CreateFeatureIdeaParams, FeatureIdea } from "../types/feature-ideas";

export function createFeatureIdeasApi(client: WishlistSupabaseClient) {
  return {
    async getApprovedFeatureIdeas(): Promise<FeatureIdea[]> {
      const { data, error } = await client.rpc("get_approved_feature_ideas");

      if (error) throw error;
      return (data ?? []) as FeatureIdea[];
    },

    async createFeatureIdea(params: CreateFeatureIdeaParams): Promise<{ id: string }> {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await client
        .from("feature_idea")
        .insert({
          title: params.title,
          description: params.description,
          user_id: user.id,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },

    async toggleFeatureIdeaVote(ideaId: string): Promise<void> {
      const { error } = await client.rpc("toggle_feature_idea_vote", {
        p_idea_id: ideaId,
      });

      if (error) throw error;
    },
  };
}
