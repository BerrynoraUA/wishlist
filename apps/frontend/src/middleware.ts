import { NextResponse, type NextRequest } from "next/server";
import { createNextMiddleware } from "gt-next/middleware";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase public env variables");
}

/**
 * General Translation locale detection (cookie, referer, Accept-Language).
 * `localeRouting: false` keeps existing URLs; no `app/[locale]` tree required.
 * @see https://generaltranslation.com/en-GB/docs/next/guides/middleware
 */
const gtLocaleMiddleware = createNextMiddleware({
  localeRouting: false,
  ignoreSourceMaps: true,
});

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

/** Copy GT + Supabase cookies onto redirects (avoid copying middleware response headers). */
function mergeCookiesIntoResponse(from: NextResponse, to: NextResponse) {
  copyCookies(from, to);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname === "/auth/callback"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/share") {
    return gtLocaleMiddleware(request);
  }

  let response = gtLocaleMiddleware(request);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/") {
    if (user) {
      const redirect = NextResponse.redirect(new URL("/home", request.url));
      mergeCookiesIntoResponse(response, redirect);
      return redirect;
    }
    return response;
  }

  if (!user && pathname !== "/login") {
    const redirectUrl = new URL("/login", request.url);
    const returnTo = `${pathname}${search}`;
    redirectUrl.searchParams.set("redirect_to", returnTo);

    const redirect = NextResponse.redirect(redirectUrl);
    mergeCookiesIntoResponse(response, redirect);
    return redirect;
  }

  if (user && pathname === "/login") {
    const redirectParam = request.nextUrl.searchParams.get("redirect_to");
    const target = redirectParam || "/home";
    const redirect = NextResponse.redirect(new URL(target, request.url));
    mergeCookiesIntoResponse(response, redirect);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
