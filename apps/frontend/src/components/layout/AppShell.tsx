"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { Providers } from "@/providers";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const hideTopNav = pathname === "/login" || pathname === "/share";

  return (
    <Providers>
      {!hideTopNav && (
        <Suspense>
          <TopNav />
        </Suspense>
      )}
      {children}
    </Providers>
  );
}
