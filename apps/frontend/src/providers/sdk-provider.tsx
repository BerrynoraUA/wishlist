"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/api/user";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { initRevenueCat, resetRevenueCat } from "@/lib/revenuecat";

export function SdkProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.id) initRevenueCat(user.id);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId) initRevenueCat(nextUserId);
      else resetRevenueCat();
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
