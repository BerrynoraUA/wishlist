import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@wishlist/backend/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminEmailAccess = {
  authenticated: boolean;
  authorized: boolean;
  email: string | null;
};

type AdminEmailRow = {
  email: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await (
      admin.from("admin_emails" as never) as unknown as {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string,
          ) => {
            maybeSingle: () => Promise<{ data: AdminEmailRow | null; error: Error | null }>;
          };
        };
      }
    )
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[admin-email-access] Failed to check admin email:", error);
      return false;
    }

    return Boolean(data);
  } catch (error) {
    console.error("[admin-email-access] Failed to initialize admin email check:", error);
    return false;
  }
}

export async function getAdminEmailAccess(): Promise<AdminEmailAccess> {
  const cookieStore = await cookies();
  const supabase = createServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // ignore when cookies cannot be mutated in this context
        }
      });
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;

  return {
    authenticated: Boolean(user),
    authorized: email ? await isAdminEmail(email) : false,
    email,
  };
}
