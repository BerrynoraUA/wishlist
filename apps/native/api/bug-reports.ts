import { createBugReportsApi } from "@wishlist/backend/api/bug-reports";
import { supabase } from "@wishlist/backend/supabase/native";

export const { createBugReport, getPublicBugReports } = createBugReportsApi(supabase);
