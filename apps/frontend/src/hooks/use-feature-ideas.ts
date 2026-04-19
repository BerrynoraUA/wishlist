import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getApprovedFeatureIdeas,
  createFeatureIdea,
  toggleFeatureIdeaVote,
} from "@/api/feature-ideas";
import type { CreateFeatureIdeaParams } from "@/api/types/feature-ideas";
import type { FeatureIdea } from "@/api/types/feature-ideas";

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
      toast.success("Idea submitted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit idea");
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
      const previous = queryClient.getQueryData<FeatureIdea[]>(queryKey);

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

      return { previous };
    },
    onError: (_err, _ideaId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
