import { onlineManager } from "@tanstack/react-query";
import * as React from "react";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();

/** Connectivity as TanStack Query sees it, fed by NetInfo in `AppStateLifecycle`. */
export function useIsOnline() {
  return React.useSyncExternalStore(subscribe, getSnapshot);
}
