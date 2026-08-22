import { PortalHost } from "@rn-primitives/portal";
import { BlurTargetView } from "expo-blur";
import * as React from "react";
import { View } from "react-native";

const AppBlurTargetContext = React.createContext<React.RefObject<View | null> | null>(null);

export function AppBlurTarget({ children }: { children: React.ReactNode }) {
  const blurTargetRef = React.useRef<View>(null);

  return (
    <AppBlurTargetContext.Provider value={blurTargetRef}>
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
      <PortalHost />
    </AppBlurTargetContext.Provider>
  );
}

export function useAppBlurTarget() {
  return React.use(AppBlurTargetContext);
}
