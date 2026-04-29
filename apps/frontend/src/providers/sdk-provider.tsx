"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getCurrentUser } from "@/api/user";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { initPaddle, setOnCheckoutComplete } from "@/lib/paddle";
import { initRevenueCat, resetRevenueCat } from "@/lib/revenuecat";

export function SdkProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

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

  useEffect(() => {
    setOnCheckoutComplete(() => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }, 3000);
    });
    initPaddle();
  }, [queryClient]);

  return <>{children}</>;
}
