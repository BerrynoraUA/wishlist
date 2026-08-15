import { cn } from "@/lib/utils";
import * as React from "react";
import { type LayoutChangeEvent, Platform, View, useWindowDimensions } from "react-native";

/**
 * Full-width decorative backdrop for the first section in a scrolling detail
 * screen. Reflected copies extend above the section so its normal gradient is
 * unchanged, while iOS pull-down overscroll reveals a continuous surface with
 * no hard seam between gradient bands.
 *
 * Children are stacked as layers with `absolute inset-0`, so the height is
 * declared exactly once here instead of being repeated on every layer.
 */
export function ScreenTopBackdrop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { height } = useWindowDimensions();
  const [bandHeight, setBandHeight] = React.useState(0);
  const overscrollBandCount =
    Platform.OS === "ios" && bandHeight > 0 ? Math.ceil(height / bandHeight) : 0;

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setBandHeight((currentHeight) =>
      Math.abs(currentHeight - nextHeight) > 0.5 ? nextHeight : currentHeight,
    );
  }, []);

  return (
    <View
      pointerEvents="none"
      className={cn("absolute inset-0", className)}
      onLayout={handleLayout}
    >
      {children}
      {Array.from({ length: overscrollBandCount }, (_, index) => (
        <View
          key={index}
          className="absolute inset-x-0"
          style={{
            bottom: bandHeight * (index + 1),
            height: bandHeight,
            transform: index % 2 === 0 ? [{ scaleY: -1 }] : undefined,
          }}
        >
          {children}
        </View>
      ))}
    </View>
  );
}
