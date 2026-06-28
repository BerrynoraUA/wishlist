import {
  createFeatureIdea,
  getApprovedFeatureIdeas,
  toggleFeatureIdeaVote,
} from "@/api/feature-ideas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFeatureIdeaParams, FeatureIdea } from "@wishlist/backend/types/feature-ideas";

export const featureIdeaKeys = {
  all: ["feature-ideas"] as const,
  approved: () => [...featureIdeaKeys.all, "approved"] as const,
};

export function useFeatureIdeas() {
  return useQuery({
    queryKey: featureIdeaKeys.approved(),
    queryFn: getApprovedFeatureIdeas,
  });
}

export function useCreateFeatureIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateFeatureIdeaParams) => createFeatureIdea(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureIdeaKeys.all });
    },
  });
}

export function useToggleFeatureIdeaVote() {
  const queryClient = useQueryClient();
  const queryKey = featureIdeaKeys.approved();

  return useMutation({
    mutationFn: (ideaId: string) => toggleFeatureIdeaVote(ideaId),
    onMutate: async (ideaId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousIdea = queryClient
        .getQueryData<FeatureIdea[]>(queryKey)
        ?.find((idea) => idea.id === ideaId);

      queryClient.setQueryData<FeatureIdea[]>(queryKey, (old) =>
        (old ?? []).map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                has_voted: !idea.has_voted,
                votes_count: idea.has_voted
                  ? Math.max(0, idea.votes_count - 1)
                  : idea.votes_count + 1,
              }
            : idea,
        ),
      );

      return { previousIdea };
    },
    onError: (_error, ideaId, context) => {
      if (!context?.previousIdea) return;
      const previousIdea = context.previousIdea;

      queryClient.setQueryData<FeatureIdea[]>(queryKey, (old) =>
        old?.map((idea) => (idea.id === ideaId ? previousIdea : idea)),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
