import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBugReport, getPublicBugReports, uploadBugScreenshot } from "@/api/bug-reports";

export const bugReportKeys = {
  all: ["bug-reports"] as const,
  public: () => [...bugReportKeys.all, "public"] as const,
};

export type SubmitBugReportParams = {
  title: string;
  description: string;
  screenshot: File | null;
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
    mutationFn: async ({ title, description, screenshot }: SubmitBugReportParams) => {
      const screenshotUrl = screenshot ? await uploadBugScreenshot(screenshot) : null;
      return createBugReport({ title, description, screenshot_url: screenshotUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugReportKeys.all });
      toast.success("Bug report submitted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit bug report");
    },
  });
}
