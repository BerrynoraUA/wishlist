import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@wishlist/backend/supabase/server";

export async function oauthSession(returnTo: string) {
  const store = await cookies();
  const db = createServerClient({
    getAll: () => store.getAll(),
    setAll: (values) => {
      try {
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      } catch {
        /* Middleware refreshes cookies during rendering. */
      }
    },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?redirect_to=${encodeURIComponent(returnTo)}`);
  return { db, user };
}
