import "./globals.scss";
import { AppShell } from "@/components/layout/AppShell";
import { DM_Sans, Playfair_Display } from "next/font/google";
import type { Viewport } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import {
  buildThemeInitScript,
  getInitialResolvedTheme,
  getAccentInlineStyles,
  parseThemePreference,
  parseAccentCookie,
  ACCENT_COOKIE_NAME,
  RESOLVED_THEME_COOKIE_NAME,
  THEME_COOKIE_NAME,
} from "@/lib/theme";
import { getLocale } from "gt-next/server";
import { GTProvider } from "gt-next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = parseThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value) ?? "system";
  const initialResolvedTheme = getInitialResolvedTheme(
    initialTheme,
    cookieStore.get(RESOLVED_THEME_COOKIE_NAME)?.value,
  );
  const initialAccent = parseAccentCookie(cookieStore.get(ACCENT_COOKIE_NAME)?.value);
  const initialBannerDismissed = Boolean(cookieStore.get("mobile_banner_dismissed")?.value);

  return (
    <html
      className={`${dmSans.variable} ${playfair.variable}`}
      data-theme={initialResolvedTheme}
      suppressHydrationWarning
      style={
        {
          colorScheme: initialResolvedTheme,
          ...getAccentInlineStyles(initialAccent, initialResolvedTheme),
        } as React.CSSProperties
      }
      lang={await getLocale()}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {buildThemeInitScript()}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <GTProvider>
          <AppShell
            initialTheme={initialTheme}
            initialResolvedTheme={initialResolvedTheme}
            initialAccent={initialAccent}
            initialBannerDismissed={initialBannerDismissed}
          >
            {children}
          </AppShell>
        </GTProvider>
      </body>
    </html>
  );
}
