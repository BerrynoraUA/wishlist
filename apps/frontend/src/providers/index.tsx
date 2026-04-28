"use client";

import { PostHogProvider } from "@/components/PostHogProvider";
import type { ResolvedTheme } from "@/lib/theme";
import type { ThemePreference } from "@/types/settings";
import { AlertTriangle, CircleCheck, CircleX, Info } from "lucide-react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth-provider";
import { SdkProvider } from "./sdk-provider";
import { ThemeProvider, useAppTheme } from "./theme-provider";

export { useAppTheme };

export function Providers({
  children,
  initialTheme,
  initialResolvedTheme,
  initialAccent,
}: {
  children: React.ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
  initialAccent: number;
}) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <ThemeProvider
          initialTheme={initialTheme}
          initialResolvedTheme={initialResolvedTheme}
          initialAccent={initialAccent}
        >
          <SdkProvider>{children}</SdkProvider>
          <Toaster
            position="bottom-right"
            closeButton
            duration={4000}
            gap={10}
            icons={{
              success: <CircleCheck size={20} strokeWidth={2.2} />,
              error: <CircleX size={20} strokeWidth={2.2} />,
              info: <Info size={20} strokeWidth={2.2} />,
              warning: <AlertTriangle size={20} strokeWidth={2.2} />,
            }}
            toastOptions={{
              style: {
                fontFamily: "inherit",
              },
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
