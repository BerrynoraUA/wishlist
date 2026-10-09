import { cn } from "@/lib/utils";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Path, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

type AuthBackgroundVariant = "sign-in" | "email";

const TILE = 96;

// Lucide's gift, heart and star outlines, on a 24px grid.
const GIFT = [
  "M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z",
  "M12 8v13",
  "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",
  "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",
];
const HEART =
  "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const STAR = "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z";

const VARIANTS: Record<
  AuthBackgroundVariant,
  {
    gradientClassName: string;
    tilt: number;
    glow: { cx: string; cy: string; rx: string; ry: string };
  }
> = {
  // The welcome screen: the paper tilts the other way, and the glow sits behind the mascot.
  "sign-in": {
    gradientClassName: "bg-linear-[160deg,#16111f_0%,#321633_56%,#641c50_100%]",
    tilt: 12,
    glow: { cx: "50%", cy: "28%", rx: "80%", ry: "34%" },
  },
  email: {
    gradientClassName: "bg-linear-[160deg,#1c1226_0%,#3a1838_55%,#7a1f5c_100%]",
    tilt: -14,
    glow: { cx: "50%", cy: "0%", rx: "120%", ry: "70%" },
  },
};

function GiftOutline({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      {GIFT.map((d) => (
        <Path key={d} d={d} />
      ))}
    </G>
  );
}

/**
 * The auth screens' backdrop: a faint wrapping-paper pattern of little gifts, hearts and
 * stars over the brand gradient, lit by a soft pink glow.
 */
export function AuthGiftWrapBackground({
  variant = "sign-in",
}: {
  variant?: AuthBackgroundVariant;
}) {
  const { gradientClassName, tilt, glow } = VARIANTS[variant];
  const patternId = `gift-wrap-${variant}`;
  const glowId = `gift-wrap-glow-${variant}`;

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View className={cn("absolute inset-0", gradientClassName)} />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id={patternId}
            height={TILE}
            patternTransform={`rotate(${tilt})`}
            patternUnits="userSpaceOnUse"
            width={TILE}
          >
            <G
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
            >
              <GiftOutline x={8} y={8} scale={1.1} />
              <G transform="translate(58 18) scale(0.75)">
                <Path d={HEART} />
              </G>
              <G transform="translate(20 58) scale(0.7)">
                <Path d={STAR} />
              </G>
              <GiftOutline x={60} y={60} scale={1} />
            </G>
            <Circle cx={48} cy={44} fill="#ffffff" r={1.6} />
            <Circle cx={10} cy={46} fill="#ffffff" r={1.2} />
            <Circle cx={86} cy={86} fill="#ffffff" r={1.2} />
          </Pattern>
          <RadialGradient id={glowId} {...glow}>
            <Stop offset="0" stopColor="#f472b6" stopOpacity={0.28} />
            <Stop offset="0.6" stopColor="#f472b6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect fill={`url(#${patternId})`} height="100%" opacity={0.09} width="100%" />
        <Rect fill={`url(#${glowId})`} height="100%" width="100%" />
      </Svg>
      {/* Darkens toward the bottom, so the controls there stay easy to read. */}
      <View className="absolute inset-x-0 bottom-0 h-[70%] bg-linear-[180deg,rgba(22,17,31,0)_0%,rgba(22,17,31,0.55)_57%,rgba(22,17,31,0.9)_100%]" />
    </View>
  );
}
