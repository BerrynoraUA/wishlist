import type { WishlistSupabaseClient } from "../supabase/types";
import type { BugReport, CreateBugReportParams } from "../types/bug-reports";

export function createBugReportsApi(client: WishlistSupabaseClient) {
  return {
    async getPublicBugReports(): Promise<BugReport[]> {
      const { data, error } = await client.rpc("get_public_bug_reports");

      if (error) throw error;
      return (data ?? []) as BugReport[];
    },

    async createBugReport(params: CreateBugReportParams): Promise<{ id: string }> {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await client
        .from("bug_report")
        .insert({
          title: params.title,
          description: params.description,
          screenshot_url: params.screenshot_url ?? null,
          user_id: user.id,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
  };
}
