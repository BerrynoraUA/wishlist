import { NextResponse, type NextRequest } from "next/server";
import { createNextMiddleware } from "gt-next/middleware";
import { createServerClient } from "@wishlist/backend/supabase/server";

const gtLocaleMiddleware = createNextMiddleware({
  localeRouting: false,
  ignoreSourceMaps: true,
});

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/privacy-policy",
  "/refund-policy",
  "/register",
  "/share",
  "/terms-of-service",
]);

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function mergeCookiesIntoResponse(from: NextResponse, to: NextResponse) {
  copyCookies(from, to);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname === "/auth/callback") {
    return NextResponse.next();
  }

  if (pathname !== "/" && PUBLIC_ROUTES.has(pathname)) {
    return gtLocaleMiddleware(request);
  }

  let response = gtLocaleMiddleware(request);

  const supabase = createServerClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set({ name, value, ...options });
      });
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

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAddAccountFlow = request.nextUrl.searchParams.get("account_mode") === "add";

  if (!user && !PUBLIC_ROUTES.has(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    const returnTo = `${pathname}${search}`;
    redirectUrl.searchParams.set("redirect_to", returnTo);

    const redirect = NextResponse.redirect(redirectUrl);
    mergeCookiesIntoResponse(response, redirect);
    return redirect;
  }

  if (user && isAuthPage && !isAddAccountFlow) {
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
