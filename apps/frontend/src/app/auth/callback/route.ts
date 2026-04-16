import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { ThemePreference } from "@/types/settings";
import {
  getInitialResolvedTheme,
  parseResolvedTheme,
  parseThemePreference,
  RESOLVED_THEME_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
} from "@/lib/theme";
import { getPostHogClient, identifyServerUser } from "@/lib/posthog-server";

const AUTH_REDIRECT_COOKIE = "bn_auth_redirect_to";

function resolveRedirectTarget(rawTarget: string | null, request: NextRequest): URL {
  if (!rawTarget || !rawTarget.startsWith("/")) {
    return new URL("/home", request.url);
  }

  return new URL(rawTarget, request.url);
}

export async function GET(request: NextRequest) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as
    | string
    | undefined;
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase public env variables" }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectParam = requestUrl.searchParams.get("redirect_to");
  const redirectCookie = request.cookies.get(AUTH_REDIRECT_COOKIE)?.value ?? null;
  const targetUrl = resolveRedirectTarget(
    redirectParam ?? (redirectCookie ? decodeURIComponent(redirectCookie) : null),
    request,
  );
  const response = NextResponse.redirect(targetUrl);
  response.cookies.set({
    name: AUTH_REDIRECT_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let persistedTheme: ThemePreference = "system";
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle();

    persistedTheme = parseThemePreference(settings?.theme) ?? "system";

    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try {
        const ph = getPostHogClient();
        identifyServerUser(ph, user);
        await ph.shutdown();
      } catch {}
    }
  }

  const resolvedTheme = getInitialResolvedTheme(
    persistedTheme,
    parseResolvedTheme(request.cookies.get(RESOLVED_THEME_COOKIE_NAME)?.value),
  );

  response.cookies.set({
    name: THEME_COOKIE_NAME,
    value: persistedTheme,
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  response.cookies.set({
    name: RESOLVED_THEME_COOKIE_NAME,
    value: resolvedTheme,
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  return response;
}
