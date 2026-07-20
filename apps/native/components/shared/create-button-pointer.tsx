import { useCreateButtonCenter } from "@/lib/create-button-box";
import { Portal } from "@rn-primitives/portal";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { View, type View as RNView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

function cssColor(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

/** Gap between the arrow tip and the top of the "+" button so it doesn't touch it. */
const BUTTON_CLEARANCE = 47;
/** Gap below the card's bottom border before the line begins. */
const CARD_CLEARANCE = 65;

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
function buildCurvePath(x1: number, y1: number, x2: number, y2: number) {
  const dy = y2 - y1;
  const amp = Math.min(72, Math.max(32, dy * 0.16));
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
  const startX = anchor.x + anchor.width / 2;
  const startY = anchor.y + anchor.height + CARD_CLEARANCE;
  const endX = button.x;
  const endY = button.y - BUTTON_CLEARANCE;

  if (endY - startY < 48) return null;

  const { d, lastControl } = buildCurvePath(startX, startY, endX, endY);
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
