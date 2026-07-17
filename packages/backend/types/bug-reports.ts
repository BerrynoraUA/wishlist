export type BugReportStatus = "pending" | "confirmed" | "in_progress" | "fixed";

export interface BugReport {
  id: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  user_id: string;
  status: BugReportStatus;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

export interface CreateBugReportParams {
  title: string;
  description: string;
  screenshot_url?: string | null;
}
