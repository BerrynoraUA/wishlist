import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApprovedFeatureIdeas,
  createFeatureIdea,
  toggleFeatureIdeaVote,
} from "@/api/feature-ideas";
import type { CreateFeatureIdeaParams } from "@/api/types/feature-ideas";

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
  return useMutation({
    mutationFn: (ideaId: string) => toggleFeatureIdeaVote(ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureIdeaKeys.all });
    },
  });
}
