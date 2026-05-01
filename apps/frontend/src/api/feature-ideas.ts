import { supabaseBrowser } from "@/lib/supabase-browser";
import { getCurrentSession } from "./user";
import type {
  FeatureIdea,
  FeatureIdeaStatus,
  CreateFeatureIdeaParams,
} from "./types/feature-ideas";

export async function getApprovedFeatureIdeas(): Promise<FeatureIdea[]> {
  const session = await getCurrentSession();
  const userId = session?.user.id;

  const { data: ideas, error } = await supabaseBrowser
    .from("feature_idea")
    .select("id, title, description, user_id, status, created_at")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const ideaIds = (ideas ?? []).map((i: { id: string }) => i.id);
  const userIds = [...new Set((ideas ?? []).map((i: { user_id: string }) => i.user_id))];

  // Fetch profile info separately
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseBrowser
      .from("profile")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      }
    }
  }

  let voteCounts: Record<string, number> = {};
  let userVotes = new Set<string>();

  if (ideaIds.length > 0) {
    const { data: counts, error: countErr } = await supabaseBrowser
      .from("feature_idea_vote")
      .select("idea_id")
      .in("idea_id", ideaIds);

    if (!countErr && counts) {
      for (const v of counts) {
        voteCounts[v.idea_id] = (voteCounts[v.idea_id] ?? 0) + 1;
      }
    }

    if (userId) {
      const { data: myVotes, error: voteErr } = await supabaseBrowser
        .from("feature_idea_vote")
        .select("idea_id")
        .eq("user_id", userId)
        .in("idea_id", ideaIds);

      if (!voteErr && myVotes) {
        userVotes = new Set(myVotes.map((v) => v.idea_id));
      }
    }
  }

  return (ideas ?? []).map((idea: Record<string, unknown>) => {
    const profile = profileMap[idea.user_id as string] ?? null;
    return {
      id: idea.id as string,
      title: idea.title as string,
      description: idea.description as string,
      user_id: idea.user_id as string,
      status: idea.status as FeatureIdeaStatus,
      votes_count: voteCounts[idea.id as string] ?? 0,
      has_voted: userVotes.has(idea.id as string),
      created_at: idea.created_at as string,
      user_display_name: profile?.display_name ?? null,
      user_avatar_url: profile?.avatar_url ?? null,
    };
  });
}

export async function createFeatureIdea(params: CreateFeatureIdeaParams): Promise<{ id: string }> {
  const session = await getCurrentSession();
  if (!session?.user.id) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("feature_idea")
    .insert({
      title: params.title,
      description: params.description,
      user_id: session.user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleFeatureIdeaVote(ideaId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user.id) throw new Error("Not authenticated");

  const { data: existing } = await supabaseBrowser
    .from("feature_idea_vote")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseBrowser
      .from("feature_idea_vote")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseBrowser
      .from("feature_idea_vote")
      .insert({ idea_id: ideaId, user_id: session.user.id });
    if (error) throw error;
  }
}
