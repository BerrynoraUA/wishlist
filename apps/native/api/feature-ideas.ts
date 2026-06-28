import { supabase } from "@wishlist/backend/supabase/native";
import type {
  CreateFeatureIdeaParams,
  FeatureIdea,
  FeatureIdeaStatus,
} from "@wishlist/backend/types/feature-ideas";

async function getCurrentUserId(): Promise<string | undefined> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.user.id;
}

export async function getApprovedFeatureIdeas(): Promise<FeatureIdea[]> {
  const userId = await getCurrentUserId();

  const { data: ideas, error } = await supabase
    .from("feature_idea")
    .select("id, title, description, user_id, status, created_at")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const ideaIds = (ideas ?? []).map((idea) => idea.id);
  const userIds = [...new Set((ideas ?? []).map((idea) => idea.user_id))];

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (profiles) {
      for (const profile of profiles) {
        profileMap[profile.id] = {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        };
      }
    }
  }

  const voteCounts: Record<string, number> = {};
  let userVotes = new Set<string>();

  if (ideaIds.length > 0) {
    const { data: counts, error: countError } = await supabase
      .from("feature_idea_vote")
      .select("idea_id")
      .in("idea_id", ideaIds);

    if (!countError && counts) {
      for (const vote of counts) {
        voteCounts[vote.idea_id] = (voteCounts[vote.idea_id] ?? 0) + 1;
      }
    }

    if (userId) {
      const { data: myVotes, error: voteError } = await supabase
        .from("feature_idea_vote")
        .select("idea_id")
        .eq("user_id", userId)
        .in("idea_id", ideaIds);

      if (!voteError && myVotes) {
        userVotes = new Set(myVotes.map((vote) => vote.idea_id));
      }
    }
  }

  return (ideas ?? []).map((idea) => {
    const profile = profileMap[idea.user_id] ?? null;

    return {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      user_id: idea.user_id,
      status: idea.status as FeatureIdeaStatus,
      votes_count: voteCounts[idea.id] ?? 0,
      has_voted: userVotes.has(idea.id),
      created_at: idea.created_at,
      user_display_name: profile?.display_name ?? null,
      user_avatar_url: profile?.avatar_url ?? null,
    };
  });
}

export async function createFeatureIdea(params: CreateFeatureIdeaParams): Promise<{ id: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("feature_idea")
    .insert({
      title: params.title,
      description: params.description,
      user_id: userId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleFeatureIdeaVote(ideaId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("feature_idea_vote")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("feature_idea_vote").delete().eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("feature_idea_vote")
      .insert({ idea_id: ideaId, user_id: userId });
    if (error) throw error;
  }
}
