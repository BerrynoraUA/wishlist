"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { Providers } from "@/providers";
import type { ResolvedTheme } from "@/lib/theme";
import type { ThemePreference } from "@/types/settings";

type Props = {
  children: ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
};

export function AppShell({
  children,
  initialTheme,
  initialResolvedTheme,
}: Props) {
  const pathname = usePathname();
  const hideTopNav = pathname === "/" || pathname === "/login" || pathname === "/share";

  return (
    <Providers
      initialTheme={initialTheme}
      initialResolvedTheme={initialResolvedTheme}
    >
      {!hideTopNav && (
        <Suspense fallback={null}>
          <TopNav />
        </Suspense>
      )}
      {children}
    </Providers>
  );
}
