import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { CircleCheck } from "lucide-react-native";
import * as React from "react";
import { Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_DURATION_MS = 2200;

type ToastPayload = { id: number; message: string };
type Listener = (toast: ToastPayload) => void;

let listener: Listener | null = null;
let nextId = 1;

/** Shows a short confirmation pill at the top of the screen, e.g. "Link copied". */
export function showToast(message: string) {
  listener?.({ id: nextId++, message });
}

/**
 * Renders toasts raised with `showToast`, above the header and sheets. Mount once, high in
 * the tree. It is a passive overlay: it never takes touches, so whatever is underneath stays
 * usable.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = React.useState<ToastPayload | null>(null);

  React.useEffect(() => {
    listener = setToast;
    return () => {
      if (listener === setToast) listener = null;
    };
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  const content = (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0 z-50 items-center px-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.springify().damping(16)}
          exiting={FadeOutUp.duration(180)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-4 py-2.5 shadow-lg"
        >
          <Icon as={CircleCheck} className="size-4 text-success" />
          <Text className="text-sm font-bold text-text">{toast.message}</Text>
        </Animated.View>
      ) : null}
    </View>
  );

  // On iOS the stack header and native sheets live in their own native layers above the React
  // root, so a plain absolute view gets cut off under them. FullWindowOverlay sits in a window
  // above everything and lets touches through. Android screens stay in the root view, where
  // the last child already draws on top — and a Modal there would swallow touches.
  return Platform.OS === "ios" ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
}
