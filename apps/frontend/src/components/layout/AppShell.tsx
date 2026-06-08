"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { MobileComingSoonBanner } from "./MobileComingSoonBanner";
import { Providers } from "@/providers";
import type { ResolvedTheme } from "@/lib/theme";
import type { ThemePreference } from "@/types/settings";

type Props = {
  children: ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
  initialAccent: number;
  initialBannerDismissed: boolean;
};

const PUBLIC_DOCUMENT_PATHS = ["/privacy-policy", "/refund-policy", "/terms-of-service"];

export function AppShell({
  children,
  initialTheme,
  initialResolvedTheme,
  initialAccent,
  initialBannerDismissed,
}: Props) {
  const pathname = usePathname();
  const hideTopNav =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/share" ||
    PUBLIC_DOCUMENT_PATHS.includes(pathname);

  return (
    <Providers
      initialTheme={initialTheme}
      initialResolvedTheme={initialResolvedTheme}
      initialAccent={initialAccent}
    >
      {!hideTopNav && (
        <Suspense fallback={null}>
          <TopNav />
        </Suspense>
      )}
      {!hideTopNav && <MobileComingSoonBanner initiallyDismissed={initialBannerDismissed} />}
      {children}
    </Providers>
  );
}
