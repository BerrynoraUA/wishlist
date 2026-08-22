import { createBugReport, getPublicBugReports } from "@/api/bug-reports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const bugReportKeys = {
  all: ["bug-reports"] as const,
  public: () => [...bugReportKeys.all, "public"] as const,
};

export type SubmitBugReportParams = {
  title: string;
  description: string;
  /** Already uploaded by the picker in the background — see `useImageUploadField`. */
  screenshotUrl: string | null;
};

export function useBugReports() {
  return useQuery({
    queryKey: bugReportKeys.public(),
    queryFn: getPublicBugReports,
  });
}

export function useCreateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, description, screenshotUrl }: SubmitBugReportParams) =>
      createBugReport({ title, description, screenshot_url: screenshotUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugReportKeys.all });
    },
  });
}
