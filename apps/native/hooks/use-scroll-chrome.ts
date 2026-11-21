import * as React from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Ignores the small movements of a finger resting on the list. */
const SCROLL_INTENT_DISTANCE = 12;

type BackButtonScrollState = { anchorY: number; hidden: boolean };

/** The back button leaves on a deliberate scroll down and returns on one back up. */
export function advanceBackButtonScroll(
  state: BackButtonScrollState,
  y: number,
): BackButtonScrollState {
  if (y <= 0) return { anchorY: 0, hidden: false };

  const moved = y - state.anchorY;
  const continuing = state.hidden ? moved > 0 : moved < 0;
  if (continuing) return { anchorY: y, hidden: state.hidden };
  if (Math.abs(moved) < SCROLL_INTENT_DISTANCE) return state;

  return { anchorY: y, hidden: moved > 0 };
}

/**
 * Scroll-driven state for what floats over a detail screen's content.
 *
 * `scrimAfter` is the offset at which a full-bleed hero has left the status bar, so the
 * scrim only appears once there is no hero for it to cut across. Screens without a hero
 * render `StatusBarScrim` always and can ignore `scrimVisible`.
 */
export function useScrollChrome(scrimAfter = 0) {
  const [backButtonHidden, setBackButtonHidden] = React.useState(false);
  const [scrimVisible, setScrimVisible] = React.useState(false);
  const backButton = React.useRef<BackButtonScrollState>({ anchorY: 0, hidden: false });

  const onScroll = React.useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      // iOS bounces past the end of the list; that rebound is not the user scrolling up.
      const maxY = Math.max(contentSize.height - layoutMeasurement.height, 0);
      const y = Math.min(contentOffset.y, maxY);

      backButton.current = advanceBackButtonScroll(backButton.current, y);
      setBackButtonHidden(backButton.current.hidden);
      setScrimVisible(y > scrimAfter);
    },
    [scrimAfter],
  );

  return { backButtonHidden, onScroll, scrimVisible };
}
