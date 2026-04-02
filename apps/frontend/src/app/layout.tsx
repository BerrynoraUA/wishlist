import "./globals.scss";
import { AppShell } from "@/components/layout/AppShell";
import { DM_Sans, Playfair_Display } from "next/font/google";
import type { Viewport } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import {
  buildThemeInitScript,
  getInitialResolvedTheme,
  parseThemePreference,
  RESOLVED_THEME_COOKIE_NAME,
  THEME_COOKIE_NAME,
} from "@/lib/theme";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialTheme =
    parseThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value) ?? "system";
  const initialResolvedTheme = getInitialResolvedTheme(
    initialTheme,
    cookieStore.get(RESOLVED_THEME_COOKIE_NAME)?.value,
  );

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable}`}
      data-theme={initialResolvedTheme}
      suppressHydrationWarning
      style={{ colorScheme: initialResolvedTheme }}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {buildThemeInitScript()}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <AppShell
          initialTheme={initialTheme}
          initialResolvedTheme={initialResolvedTheme}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
