import * as React from "react";
import { Modal, Platform } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

export interface WindowOverlayProps {
  children: React.ReactNode;
  /**
   * Called when the Android hardware back button is pressed while the overlay
   * is visible. The Android Modal consumes the back press, so the primitive's
   * own BackHandler never fires — close it here instead.
   */
  onRequestClose?: () => void;
}

/**
 * Hosts floating content (dropdowns, dialogs, popovers) in a native window
 * above everything else. Portaled content parented to the React Native root
 * view renders behind native bottom sheets (TrueSheet presents in its own
 * window above the root), so overlays opened from inside a sheet must live in
 * a separate window: FullWindowOverlay on iOS, a transparent Modal on Android.
 * Both cover the full screen, which keeps `measure()`-based positioning valid.
 */
export function WindowOverlay({ children, onRequestClose }: WindowOverlayProps) {
  if (Platform.OS === "ios") {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
}
