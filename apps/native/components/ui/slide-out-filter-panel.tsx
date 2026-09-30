import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { BackHandler, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const FILTER_PANEL_FALLBACK_HEIGHT = 220;
/**
 * Space between the row that opens a panel and the panel's first control. Whatever follows
 * the panel keeps its own 16pt gap below it, so the panel sits evenly between the two.
 */
const SLIDE_OUT_PANEL_GAP = 16;
const FILTER_ROW_HEIGHT = process.env.EXPO_OS === "android" ? 48 : 44;
/** Initial estimate: gap + two control rows 12pt apart. Replaced by the measured height. */
export const WISHLIST_FILTER_PANEL_HEIGHT = SLIDE_OUT_PANEL_GAP + FILTER_ROW_HEIGHT * 2 + 12;
/** Initial estimate: gap + three control rows 12pt apart. Replaced by the measured height. */
export const ITEM_FILTER_PANEL_HEIGHT = SLIDE_OUT_PANEL_GAP + FILTER_ROW_HEIGHT * 3 + 12 * 2;

const OPEN_DURATION = 240;
const CLOSE_DURATION = 200;
/** Standard "emphasized decelerate" curve: moves at once, settles softly. */
const PANEL_EASING = Easing.bezier(0.2, 0, 0, 1);

/**
 * Open state for a slide-out filter panel, plus the shared progress (0 closed → 1 open)
 * that drives it on the UI thread.
 *
 * The animation starts inside `setOpen` itself rather than in an effect after React has
 * re-rendered the screen, so it begins on the next frame after the tap no matter how
 * heavy that re-render is. Everything that has to move with the panel — the panel, and
 * the `SlideOutSpacer` that pushes the content below it — reads this one value, so they
 * stay in lockstep.
 */
export function useSlideOutPanel(
  initialOpen = false,
  initialHeight = FILTER_PANEL_FALLBACK_HEIGHT,
) {
  const reduceMotion = useReducedMotion();
  const [open, setOpenState] = React.useState(initialOpen);
  const progress = useSharedValue(initialOpen ? 1 : 0);
  const height = useSharedValue(initialHeight);

  const setOpen = React.useCallback(
    (next: boolean) => {
      progress.set(
        withTiming(next ? 1 : 0, {
          duration: reduceMotion ? 0 : next ? OPEN_DURATION : CLOSE_DURATION,
          easing: PANEL_EASING,
        }),
      );
      setOpenState(next);
    },
    [progress, reduceMotion],
  );

  useFocusEffect(
    React.useCallback(() => {
      if (process.env.EXPO_OS !== "android" || !open) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        setOpen(false);
        return true;
      });
      return () => subscription.remove();
    }, [open, setOpen]),
  );

  return { open, setOpen, progress, height };
}

/**
 * The collapsible panel. Its height animates with the fade, so layout below it (in the
 * same flow) moves in step. It stays mounted while closed, at zero height, so opening
 * only has to run the animation instead of mounting inputs on the tap.
 */
export function SlideOutFilterPanel({
  open,
  progress,
  children,
  className,
  height,
}: {
  open: boolean;
  progress: SharedValue<number>;
  children: React.ReactNode;
  className?: string;
  /** Share the measured height with the spacer for a panel in a pinned header. */
  height?: SharedValue<number>;
}) {
  const contentHeight = useSharedValue(FILTER_PANEL_FALLBACK_HEIGHT);
  const measuredHeight = height ?? contentHeight;
  const containerStyle = useAnimatedStyle(() => ({
    height: measuredHeight.get() * progress.get(),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: -12 * (1 - progress.get()) }],
  }));

  return (
    <Animated.View
      className="overflow-hidden"
      pointerEvents={open ? "auto" : "none"}
      style={containerStyle}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
    >
      <Animated.View style={contentStyle}>
        <View
          className={cn("gap-3", className)}
          style={{ paddingTop: SLIDE_OUT_PANEL_GAP }}
          onLayout={(event) => {
            measuredHeight.set(event.nativeEvent.layout.height);
          }}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Empty space that grows with a panel living outside the list — in a pinned header that
 * overlays it. Put it at the top of the list's `ListHeaderComponent`: the header flows
 * above the recycled cells, so the cells slide down with it on the UI thread instead of
 * waiting for a JS re-layout of the list's padding on every frame.
 */
export function SlideOutSpacer({
  progress,
  height,
}: {
  progress: SharedValue<number>;
  height: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({ height: height.get() * progress.get() }));

  return <Animated.View pointerEvents="none" style={style} />;
}
