import { hapticSelection } from "@/lib/haptics";
import * as React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** Share of the row width a drag has to cover before letting go deletes the row. */
const DELETE_RATIO = 0.35;
/** A fast flick to the left deletes even when it is short (px/s). */
const FLING_VELOCITY = 900;
const SNAP_BACK = { damping: 20, stiffness: 260, mass: 0.8 };

/**
 * Drag a row to the left to delete it. The row follows the finger 1:1 on the UI thread and
 * fades as it goes; let go past the threshold (or flick) and it slides off and collapses,
 * otherwise it springs back.
 *
 * Gesture-handler, not PanResponder, so tracking never waits on the JS thread. Inside a
 * native bottom sheet the content must sit in a `GestureHandlerRootView` (Android renders the
 * sheet in its own layout, which needs a fresh gesture root).
 */
export function SwipeToDelete({
  onDelete,
  accessibilityLabel,
  collapseGap = 0,
  children,
}: {
  /** Resolve when the row is gone; reject to slide it back. */
  onDelete: () => Promise<unknown>;
  /** Label for the accessibility "delete" action. */
  accessibilityLabel: string;
  /** Gap the parent puts after the row, swallowed while it collapses so nothing jumps. */
  collapseGap?: number;
  children: React.ReactNode;
}) {
  const translateX = useSharedValue(0);
  const collapse = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const armed = useSharedValue(false);
  const deleting = useSharedValue(false);
  const onDeleteRef = React.useRef(onDelete);
  onDeleteRef.current = onDelete;

  const restore = React.useCallback(() => {
    deleting.value = false;
    collapse.value = withTiming(0, { duration: 200 });
    translateX.value = withSpring(0, SNAP_BACK);
  }, [collapse, deleting, translateX]);

  const runDelete = React.useCallback(() => {
    void onDeleteRef.current().catch(restore);
  }, [restore]);

  const slideOut = React.useCallback(
    (velocity: number) => {
      "worklet";
      deleting.value = true;
      // Keep the flick's momentum: a fast release finishes sooner than a slow one.
      const remaining = width.value + translateX.value;
      const duration = Math.max(120, Math.min(260, (remaining / Math.max(-velocity, 1)) * 1000));
      translateX.value = withTiming(
        -width.value,
        { duration, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (!finished) return;
          collapse.value = withTiming(
            1,
            { duration: 200, easing: Easing.inOut(Easing.quad) },
            (done) => {
              if (done) runOnJS(runDelete)();
            },
          );
        },
      );
    },
    [collapse, deleting, runDelete, translateX, width],
  );

  const pan = Gesture.Pan()
    // Horizontal intent only: a vertical drag fails this and goes to the sheet's scroll.
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => {
      armed.value = false;
    })
    .onUpdate((event) => {
      if (deleting.value) return;
      // Left follows the finger; right only gives a little rubber-band resistance.
      translateX.value = event.translationX < 0 ? event.translationX : event.translationX * 0.12;

      const nextArmed = -translateX.value > width.value * DELETE_RATIO;
      if (nextArmed !== armed.value) {
        armed.value = nextArmed;
        if (nextArmed) runOnJS(hapticSelection)();
      }
    })
    .onEnd((event) => {
      if (deleting.value) return;
      if (armed.value || (event.velocityX < -FLING_VELOCITY && event.translationX < 0)) {
        slideOut(Math.min(event.velocityX, -600));
      } else {
        translateX.value = withSpring(0, { ...SNAP_BACK, velocity: event.velocityX });
      }
    });

  const containerStyle = useAnimatedStyle(() =>
    collapse.value === 0
      ? {}
      : {
          height: height.value * (1 - collapse.value),
          marginBottom: -collapseGap * collapse.value,
        },
  );
  const rowStyle = useAnimatedStyle(() => {
    const distance = width.value === 0 ? 0 : Math.max(0, -translateX.value) / width.value;
    return {
      opacity: interpolate(distance, [0, 0.9], [1, 0.15], "clamp"),
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Animated.View
      style={[{ overflow: "hidden" }, containerStyle]}
      onLayout={(event) => {
        if (collapse.value !== 0) return;
        width.value = event.nativeEvent.layout.width;
        height.value = event.nativeEvent.layout.height;
      }}
      accessibilityActions={[{ name: "delete", label: accessibilityLabel }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "delete") slideOut(-1000);
      }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
