import { useCreateButtonCenter } from "@/lib/create-button-box";
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
/** Radius of the "+" button; the tip must never come closer than this to its centre. */
const CREATE_BUTTON_RADIUS = 26;
/** Gap between the arrow tip and the button's edge. */
const BUTTON_CLEARANCE = CREATE_BUTTON_RADIUS + 14;
/** Hard floor once the gaps are being squeezed, so the tip never sits on the button. */
const BUTTON_CLEARANCE_FLOOR = CREATE_BUTTON_RADIUS + 6;

/** Below this the curve reads as a stub rather than a pointer, so it is dropped. */
const MIN_LINE_LENGTH = 40;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
 */
function buildCurvePath(x1: number, y1: number, x2: number, y2: number, maxAmp: number) {
  const dy = y2 - y1;
  // Bow scales with the run instead of a fixed floor, so a short line stays a gentle
  // bend rather than a wide swing, and never bows past the edge of the screen.
  const amp = clamp(dy * 0.16, 12, maxAmp);
  const midX = (x1 + x2) / 2;
  const midY = y1 + dy * 0.55;

  const c1x = x1 - amp * 0.9;
  const c1y = y1 + dy * 0.2;
  const c2x = midX - amp;
  const c2y = midY - dy * 0.12;
  const c3x = midX + amp;
  const c3y = midY + dy * 0.12;
  const c4x = x2 + amp * 0.55;
  const c4y = y2 - dy * 0.18;

  const d =
    `M${x1},${y1} ` +
    `C${c1x},${c1y} ${c2x},${c2y} ${midX},${midY} ` +
    `C${c3x},${c3y} ${c4x},${c4y} ${x2},${y2}`;

  return { d, lastControl: { x: c4x, y: c4y } };
}

function PointerLine({ anchor, button }: { anchor: Rect; button: { x: number; y: number } }) {
  const color = cssColor(useCSSVariable("--color-text-muted"), "#94a3b8");
  const { width } = useWindowDimensions();
  const startX = anchor.x + anchor.width / 2;
  const endX = button.x;

  // Both gaps hold their intended size while the space allows it, and only shrink —
  // together, so the line stays centred between the two — once it does not.
  const available = button.y - (anchor.y + anchor.height);
  const squeeze = clamp(available / (CARD_CLEARANCE + BUTTON_CLEARANCE + MIN_LINE_LENGTH), 0, 1);
  const startY = anchor.y + anchor.height + CARD_CLEARANCE * squeeze;
  const endY = button.y - Math.max(BUTTON_CLEARANCE * squeeze, BUTTON_CLEARANCE_FLOOR);

  if (endY - startY < MIN_LINE_LENGTH) return null;

  // Keep the bow inside the screen: it swings left of the start and right of the midpoint.
  const maxAmp = clamp(Math.min(startX, width - Math.max(startX, endX)) * 0.6, 12, 72);
  const { d, lastControl } = buildCurvePath(startX, startY, endX, endY, maxAmp);
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
