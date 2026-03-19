import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase public env variables");
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (
    pathname.startsWith("/api") ||
    pathname === "/auth/callback" ||
    pathname === "/share"
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

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

  if (!user && pathname !== "/login") {
    const redirectUrl = new URL("/login", request.url);
    const returnTo = `${pathname}${search}`;
    redirectUrl.searchParams.set("redirect_to", returnTo);

    const redirect = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirect);
    return redirect;
  }

  if (user && pathname === "/login") {
    const redirectParam = request.nextUrl.searchParams.get("redirect_to");
    const target = redirectParam || "/home";
    const redirect = NextResponse.redirect(new URL(target, request.url));
    copyCookies(response, redirect);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
