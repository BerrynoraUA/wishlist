import { supabase } from "@wishlist/backend/supabase/native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import * as React from "react";
import { AppState, Platform } from "react-native";

export function AppStateLifecycle() {
  React.useEffect(() => {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
  }, []);

  React.useEffect(() => {
    if (Platform.OS === "web") return;

    function updateForAppState(state: string) {
      const isActive = state === "active";
      focusManager.setFocused(isActive);

      if (isActive) {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }

    updateForAppState(AppState.currentState);
    const subscription = AppState.addEventListener("change", updateForAppState);

    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return null;
}
