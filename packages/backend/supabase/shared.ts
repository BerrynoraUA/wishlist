export function getSupabasePublicEnv() {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL) as string | undefined;
  const key = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

  if (!url || !key) {
    throw new Error("Missing Supabase public env variables");
  }

  return { url, key };
}

export function getSupabaseServiceEnv(serviceKey?: string) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as
    | string
    | undefined;
  const key = serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin env variables");
  }

  return { url, key };
}
