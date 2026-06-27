import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height of the colored decoration band below the status bar on detail screens. */
const BACKDROP_CONTENT_HEIGHT = 240;

/**
 * Full-width decorative backdrop pinned to the top of a detail screen, sized to
 * cover the status bar plus a fixed content band.
 *
 * Children are stacked as layers with `absolute inset-0`, so the height is
 * declared exactly once (here) instead of being repeated on every layer.
 */
export function ScreenTopBackdrop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      className={cn("absolute inset-x-0 top-0", className)}
      style={{ height: insets.top + BACKDROP_CONTENT_HEIGHT }}
    >
      {children}
    </View>
  );
}
