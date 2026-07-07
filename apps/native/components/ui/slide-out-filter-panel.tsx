import { motionDuration, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const FILTER_PANEL_FALLBACK_HEIGHT = 220;
export const WISHLIST_FILTER_PANEL_HEIGHT = 120;
export const ITEM_FILTER_PANEL_HEIGHT = 176;

export function SlideOutFilterPanel({
  open,
  children,
  className,
  maxHeight = FILTER_PANEL_FALLBACK_HEIGHT,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  maxHeight?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [rendered, setRendered] = React.useState(open);
  const progress = useSharedValue(open ? 1 : 0);
  const hidePanel = React.useCallback(() => {
    setRendered(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      setRendered(true);
    }
  }, [open]);

  React.useEffect(() => {
    if (!rendered) return;

    const duration = reduceMotion ? 0 : motionDuration.normal;

    progress.value = withTiming(open ? 1 : 0, { duration }, (finished) => {
      if (finished && !open) {
        runOnJS(hidePanel)();
      }
    });
  }, [hidePanel, open, progress, reduceMotion, rendered]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: -10 * (1 - progress.value) }],
  }));

  if (!rendered) return null;

  return (
    <View
      className="overflow-hidden"
      pointerEvents={open ? "auto" : "none"}
      style={{ height: maxHeight }}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
    >
      <Animated.View style={animatedStyle}>
        <View className={cn("gap-3", className)}>{children}</View>
      </Animated.View>
    </View>
  );
}
