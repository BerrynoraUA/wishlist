import { createBugReport, getPublicBugReports, uploadBugScreenshot } from "@/api/bug-reports";
import type { NativePickedImage } from "@/lib/image-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const bugReportKeys = {
  all: ["bug-reports"] as const,
  public: () => [...bugReportKeys.all, "public"] as const,
};

export type SubmitBugReportParams = {
  title: string;
  description: string;
  screenshot: NativePickedImage | null;
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
    },
  });
}
