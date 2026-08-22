import { useCreateButtonCenter, type CreateButtonBox } from "@/lib/create-button-box";
import { Portal } from "@rn-primitives/portal";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { useWindowDimensions, View, type View as RNView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

function cssColor(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

// Clearances are taken as a share of the space actually left between the card and the
// button, then clamped. Fixed pixel gaps ate the whole run on short screens — the line
// collapsed under its own minimum-length guard and vanished — while leaving the curve
// stranded far above the button on tall ones.
// The line has to read as joining two objects, so both gaps stay small and fixed — it is
// the span between them that absorbs the screen size. Scaling the gaps with the free
// space instead leaves the curve hanging in the middle, attached to neither end.
/** Gap below the card's bottom border before the line begins. */
const CARD_CLEARANCE = 14;
/** Gap between the arrow tip and the button's edge. */
const BUTTON_EDGE_GAP = 14;
/** Hard floor once the gaps are being squeezed, so the tip never sits on the button. */
const BUTTON_EDGE_GAP_FLOOR = 6;

/** Below this the curve reads as a stub rather than a pointer, so it is dropped. */
const MIN_LINE_LENGTH = 40;

/** Keeps every control point, and so the whole curve, clear of the window edges. */
const EDGE_MARGIN = 12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Wraps an empty-state card and draws a solid, gracefully bending line from
 * the card's bottom border down to just above the global "+" create button.
 */
export function CreateButtonPointer({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<RNView>(null);
  const [anchor, setAnchor] = React.useState<Rect | null>(null);
  // Tab screens stay mounted when another tab is focused, and the line is
  // portaled to the app root — without focus gating an empty state on a
  // background tab would keep drawing over the whole app.
  const [focused, setFocused] = React.useState(false);
  const button = useCreateButtonCenter();

  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const measure = React.useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setAnchor({ x, y, width, height });
    });
  }, []);

  React.useEffect(() => {
    if (!focused) return;
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, focused, button.x, button.y]);

  return (
    <View ref={ref} collapsable={false} onLayout={measure}>
      {children}
      {focused && anchor ? <PointerLine anchor={anchor} button={button} /> : null}
    </View>
  );
}

/**
 * Smooth S-curve through a midpoint: bows out to one side on the way down,
 * then swings back to arrive at the endpoint heading straight down.
 *
 * How pronounced that is scales with `sweep`, the sideways run measured against the drop.
 * With the button directly below the card — the Android bar, where the "+" is the middle
 * slot — it stays the gentle bow it has always been. With the button off to one side, as
 * iOS 26 places it, the same shallow bow would read as a slanted line, so the curve opens
 * up into three legs instead: straight down out of the card, a wide swing across, then
 * straight down into the tip.
 */
function buildCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  maxAmp: number,
  width: number,
) {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const run = Math.abs(dx);
  /** The swing follows the button, so a right-hand button gives the historical shape back. */
  const side = dx < 0 ? -1 : 1;
  // Bow scales with the run instead of a fixed floor, so a short line stays a gentle
  // bend rather than a wide swing, and never bows past the edge of the screen.
  const amp = clamp(dy * 0.16, 12, maxAmp);
  const sweep = clamp(run / Math.max(dy * 0.6, 1), 0, 1);
  // A run of its own to cross widens the swing well past `amp`; `bowX` is what keeps it
  // on screen from here, since the curve stays inside the hull of its control points.
  const bow = amp + run * 0.35 * sweep;

  // Handle lengths round the two turns off. They have to stay ordered — each control point
  // below its successor — or the curve kinks back on itself, which caps how long the
  // straight legs can get: `lead` under `0.55 - shoulder`, `tail` under `0.45 - shoulder`.
  const lead = lerp(0.2, 0.3, sweep);
  const shoulder = lerp(0.12, 0.18, sweep);
  const tail = lerp(0.18, 0.24, sweep);
  // How far the curve may travel back against the run before turning. That backwards dip is
  // the only thing making an S out of a button sitting directly below the card, but the
  // moment the button is off to one side it just looks like a wrong turn, so it is gone by
  // the time the run is as wide as the bow — off `run` rather than `sweep`, so a card that
  // sits high on the screen doesn't earn one back on the strength of its long drop.
  const back = 1 - clamp(run / Math.max(amp, 1), 0, 1);
  const leadBack = bow * 0.9 * back;
  const midBack = bow * back;
  // Overshoot past the tip fades with the run too, leaving the arrow aimed at the button.
  const overshoot = bow * lerp(0.55, 0, sweep);

  // Offsets along the run, so "back" and "forward" stay meaningful whichever side the
  // button is on; `midX` itself rides the straight line between the two ends.
  const midX = (x1 + x2) / 2;
  const midY = y1 + dy * 0.55;
  const bowX = (offset: number) => clamp(x1 + side * offset, EDGE_MARGIN, width - EDGE_MARGIN);

  const c1x = bowX(-leadBack);
  const c1y = y1 + dy * lead;
  const c2x = bowX(Math.max(run / 2 - bow, -midBack));
  const c2y = midY - dy * shoulder;
  const c3x = bowX(run / 2 + bow);
  const c3y = midY + dy * shoulder;
  const c4x = bowX(run + overshoot);
  const c4y = y2 - dy * tail;

  const d =
    `M${x1},${y1} ` +
    `C${c1x},${c1y} ${c2x},${c2y} ${midX},${midY} ` +
    `C${c3x},${c3y} ${c4x},${c4y} ${x2},${y2}`;

  return { d, lastControl: { x: c4x, y: c4y } };
}

function PointerLine({ anchor, button }: { anchor: Rect; button: CreateButtonBox }) {
  const color = cssColor(useCSSVariable("--color-text-muted"), "#94a3b8");
  const { width } = useWindowDimensions();
  const startX = anchor.x + anchor.width / 2;
  const endX = button.x;

  // The tip is placed against the button's edge rather than its centre, so it keeps the
  // same visual gap whether it points at the raised Android FAB or the larger detached
  // circle iOS 26 puts beside the tab bar.
  const buttonClearance = button.radius + BUTTON_EDGE_GAP;
  const buttonClearanceFloor = button.radius + BUTTON_EDGE_GAP_FLOOR;

  // Both gaps hold their intended size while the space allows it, and only shrink —
  // together, so the line stays centred between the two — once it does not.
  const available = button.y - (anchor.y + anchor.height);
  const squeeze = clamp(available / (CARD_CLEARANCE + buttonClearance + MIN_LINE_LENGTH), 0, 1);
  const startY = anchor.y + anchor.height + CARD_CLEARANCE * squeeze;
  const endY = button.y - Math.max(buttonClearance * squeeze, buttonClearanceFloor);

  if (endY - startY < MIN_LINE_LENGTH) return null;

  // Keep the bow inside the screen: it swings left of the start and right of the midpoint.
  const maxAmp = clamp(Math.min(startX, width - Math.max(startX, endX)) * 0.6, 12, 72);
  const { d, lastControl } = buildCurvePath(startX, startY, endX, endY, maxAmp, width);
  const angle = Math.atan2(endY - lastControl.y, endX - lastControl.x);
  const wingLength = 9;
  const leftWing = angle + (Math.PI * 3) / 4;
  const rightWing = angle - (Math.PI * 3) / 4;
  const arrowD = `M${endX + Math.cos(leftWing) * wingLength},${endY + Math.sin(leftWing) * wingLength} L${endX},${endY} L${endX + Math.cos(rightWing) * wingLength},${endY + Math.sin(rightWing) * wingLength}`;

  return (
    <Portal name="create-button-pointer">
      <View pointerEvents="none" className="absolute inset-0">
        <Svg width="100%" height="100%">
          <Path
            d={d}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.7}
          />
          <Path
            d={arrowD}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.7}
          />
        </Svg>
      </View>
    </Portal>
  );
}
