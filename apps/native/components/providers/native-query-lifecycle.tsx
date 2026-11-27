import { supabase } from "@wishlist/backend/supabase/native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { setOfflineErrorMessage } from "@/lib/offline-mutations";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useGT } from "gt-react-native";
import * as React from "react";
import { AppState, Platform } from "react-native";

export function isNetInfoOnline(state: NetInfoState) {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function AppStateLifecycle() {
  const t = useGT();
  const offlineMessage = t("You're offline. Try again once you're connected.");

  React.useEffect(() => {
    setOfflineErrorMessage(offlineMessage);
  }, [offlineMessage]);

  React.useEffect(() => {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(isNetInfoOnline(state));
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
