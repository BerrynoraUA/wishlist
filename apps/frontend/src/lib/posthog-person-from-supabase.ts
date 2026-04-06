import type { User } from "@supabase/supabase-js";

/** Person properties for PostHog identify (client or server). */
export function posthogPersonPropsFromSupabaseUser(user: User): {
  email?: string;
  name?: string;
} {
  const meta = user.user_metadata;
  let name: string | undefined;
  if (meta && typeof meta === "object") {
    if (typeof meta.full_name === "string" && meta.full_name.trim()) {
      name = meta.full_name.trim();
    } else if (typeof meta.name === "string" && meta.name.trim()) {
      name = meta.name.trim();
    }
  }
  return {
    ...(user.email ? { email: user.email } : {}),
    ...(name ? { name } : {}),
  };
}
