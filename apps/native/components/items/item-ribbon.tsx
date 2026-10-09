import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as React from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const RESERVED_RIBBON = require("@/assets/images/ribbons/reserved.png");
const PURCHASED_RIBBON = require("@/assets/images/ribbons/purchased.png");

const RIBBON_ANGLE = "-38deg";
const SPARKLE_COUNT = 12;
const RESERVED_SPARKLES = ["#8B5CF6", "#C4B5FD", "#FFD166", "#FFFFFF"];
const PURCHASED_SPARKLES = ["#34D399", "#A7F3D0", "#FFD166", "#FFFFFF"];

export type ItemRibbonPhase = "static" | "enter" | "exit";

function Sparkle({ index, color, distance }: { index: number; color: string; distance: number }) {
  const progress = useSharedValue(0);
  const angle = (index / SPARKLE_COUNT) * Math.PI * 2 + (index % 2) * 0.25;
  const reach = distance * (0.65 + (index % 3) * 0.2);
  const size = 4 + (index % 3) * 2;

  React.useEffect(() => {
    progress.value = withDelay(
      320 + (index % 4) * 25,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * reach * progress.value },
      { translateY: Math.sin(angle) * reach * progress.value },
      { scale: 1.2 - progress.value * 0.6 },
      { rotate: `${progress.value * 180}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: index % 2 === 0 ? size : size * 1.8,
          borderRadius: index % 2 === 0 ? size / 2 : 1.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * The reserved / purchased sash across an item image.
 *
 * `enter` pulls the sash in along its own diagonal, lets it overshoot and settle, stamps the
 * label on, sweeps a shine across and throws a few sparkles. `exit` slides it out the far
 * side, then calls `onExited`. `static` just shows it, for items that were already taken.
 */
export function ItemRibbon({
  purchased,
  label,
  isStamp,
  isDetail,
  phase: phaseProp,
  onExited,
}: {
  purchased: boolean;
  label: string;
  /** A custom label (a revealed name) instead of the uppercase status word. */
  isStamp: boolean;
  isDetail: boolean;
  /** Read on mount only; remount (change the key) to play another transition. */
  phase: ItemRibbonPhase;
  onExited?: () => void;
}) {
  const [phase] = React.useState(phaseProp);
  const animated = phase !== "static";
  const slide = useSharedValue(0);
  const unfurl = useSharedValue(1);
  const stamp = useSharedValue(1);
  const labelIn = useSharedValue(phase === "enter" ? 0 : 1);
  const shine = useSharedValue(0);
  const visible = useSharedValue(phase === "enter" ? 0 : 1);
  const startedRef = React.useRef(false);
  const [width, setWidth] = React.useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    const layoutWidth = event.nativeEvent.layout.width;
    setWidth(layoutWidth);
    if (!animated || startedRef.current || layoutWidth === 0) return;
    startedRef.current = true;

    if (phase === "enter") {
      slide.value = -layoutWidth;
      unfurl.value = 0.35;
      visible.value = 1;
      slide.value = withSpring(0, { damping: 15, stiffness: 150, mass: 0.9 });
      unfurl.value = withSpring(1, { damping: 10, stiffness: 160 });
      stamp.value = withDelay(
        300,
        withSequence(
          withTiming(1.07, { duration: 110, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 8, stiffness: 220 }),
        ),
      );
      labelIn.value = withDelay(260, withSpring(1, { damping: 9, stiffness: 180 }));
      shine.value = withDelay(
        480,
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      );
      return;
    }

    labelIn.value = withTiming(0, { duration: 140 });
    slide.value = withTiming(layoutWidth, { duration: 380, easing: Easing.in(Easing.cubic) });
    visible.value = withDelay(220, withTiming(0, { duration: 160 }));
    if (onExited) setTimeout(onExited, 400);
  }

  const sashStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateX: slide.value }, { scaleY: unfurl.value }, { scale: stamp.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelIn.value,
    transform: [{ scale: 1.8 - labelIn.value * 0.8 }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value === 0 || shine.value === 1 ? 0 : 0.55,
    transform: [{ translateX: -60 + shine.value * (width + 120) }, { skewX: "-20deg" }],
  }));

  const sparkleColors = purchased ? PURCHASED_SPARKLES : RESERVED_SPARKLES;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-0 items-center justify-center"
    >
      <View
        onLayout={handleLayout}
        className={cn("w-[135%] items-center justify-center", isDetail ? "h-44" : "h-36")}
        style={{ transform: [{ rotate: RIBBON_ANGLE }] }}
      >
        <Animated.View className="absolute inset-0 items-center justify-center" style={sashStyle}>
          <StyledImage
            source={purchased ? PURCHASED_RIBBON : RESERVED_RIBBON}
            contentFit="fill"
            className="absolute left-0 size-full"
            // Align the flat face with the label despite the artwork's transparent padding.
            style={{ top: purchased ? "1%" : "4%" }}
          />
          {phase === "enter" ? (
            // Clipped to the sash's flat face so the glint never shows outside the ribbon.
            <View
              className="absolute inset-x-0 overflow-hidden"
              style={{ top: "30%", bottom: "26%" }}
            >
              <Animated.View className="absolute inset-y-0 w-10 bg-white" style={shineStyle} />
            </View>
          ) : null}
          <Animated.View className="max-w-[72%]" style={labelStyle}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className={cn(
                "text-center font-bold uppercase",
                purchased ? "text-[#245B45]" : "text-[#654098]",
                isStamp ? "text-sm" : "tracking-wide",
                !isStamp && (isDetail ? "text-lg" : "text-sm"),
              )}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>

      {phase === "enter"
        ? Array.from({ length: SPARKLE_COUNT }, (_, index) => (
            <Sparkle
              key={index}
              index={index}
              color={sparkleColors[index % sparkleColors.length]!}
              distance={isDetail ? 120 : 70}
            />
          ))
        : null}
    </View>
  );
}
