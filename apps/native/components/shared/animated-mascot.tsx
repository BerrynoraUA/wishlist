import { useAppReady } from "@/components/splash/animated-splash";
import { Text } from "@/components/ui/text";
import { hapticPoke } from "@/lib/haptics";
import { useReducedMotion } from "@/lib/motion";
import { Image, type ImageSource } from "expo-image";
import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

export type MascotVariant =
  | "sad-alone"
  | "gift-in-hands"
  | "empty-hands-shrug"
  | "magnifying-glass"
  | "explorer-map"
  | "sleeping-bell"
  | "lightbulb-idea"
  | "santa-sack"
  | "holding-key"
  | "happy-pointing-down"
  | "welcome-wave"
  | "excited-cheer"
  | "hands-over-eyes"
  | "peeking";

const MASCOT_IMAGES: Record<MascotVariant, ImageSource> = {
  "sad-alone": require("@/assets/images/mascot/sad-alone.webp"),
  "gift-in-hands": require("@/assets/images/mascot/gift-in-hands.webp"),
  "empty-hands-shrug": require("@/assets/images/mascot/empty-hands-shrug.webp"),
  "magnifying-glass": require("@/assets/images/mascot/magnifying-glass.webp"),
  "explorer-map": require("@/assets/images/mascot/explorer-map.webp"),
  "sleeping-bell": require("@/assets/images/mascot/sleeping-bell.webp"),
  "lightbulb-idea": require("@/assets/images/mascot/lightbulb-idea.webp"),
  "santa-sack": require("@/assets/images/mascot/santa-sack.webp"),
  "holding-key": require("@/assets/images/mascot/holding-key.webp"),
  "happy-pointing-down": require("@/assets/images/mascot/happy-pointing-down.webp"),
  "welcome-wave": require("@/assets/images/mascot/welcome-wave.webp"),
  "excited-cheer": require("@/assets/images/mascot/excited-cheer.webp"),
  "hands-over-eyes": require("@/assets/images/mascot/hands-over-eyes.webp"),
  peeking: require("@/assets/images/mascot/peeking.webp"),
};

/** Closed-eye patches, transparent outside the eyes, laid over the artwork to blink. */
const BLINK_IMAGES: Partial<Record<MascotVariant, ImageSource>> = {
  "gift-in-hands": require("@/assets/images/mascot/gift-in-hands-blink.webp"),
};

/** [ms into the loop, value]. Values ease in and out between keyframes. */
type Keyframes = readonly (readonly [number, number])[];

type MascotMotion = {
  entrance: "pop" | "drop";
  /** Idle squash and stretch: half a breath in ms, and how far it stretches. */
  breath: { duration: number; amount: number };
  /**
   * The pose's signature move, looped every `duration` ms. Offsets are fractions of the
   * mascot size, rotation is in degrees, scales are deltas from 1.
   */
  move: {
    duration: number;
    x?: Keyframes;
    y?: Keyframes;
    rotate?: Keyframes;
    scaleX?: Keyframes;
    scaleY?: Keyframes;
    /** Bulb glow opacity, 0–1. */
    glow?: Keyframes;
    /** Key sparkles, 0–1. */
    sparkleA?: Keyframes;
    sparkleB?: Keyframes;
  };
  zzz?: boolean;
};

const BREATH = { duration: 1700, amount: 0.022 };

const MOTIONS: Record<MascotVariant, MascotMotion> = {
  // A sigh: breathes in, slumps, stays slumped for a while, recovers.
  "sad-alone": {
    entrance: "pop",
    breath: { duration: 2200, amount: 0.016 },
    move: {
      duration: 6500,
      y: [
        [0, 0],
        [700, -0.02],
        [1600, 0.025],
        [3800, 0.025],
        [5000, 0],
      ],
      scaleY: [
        [0, 0],
        [700, 0.03],
        [1600, -0.04],
        [3800, -0.04],
        [5000, 0],
      ],
      scaleX: [
        [0, 0],
        [700, -0.01],
        [1600, 0.02],
        [3800, 0.02],
        [5000, 0],
      ],
      rotate: [
        [0, 0],
        [1600, -3],
        [3800, -3],
        [5000, 0],
      ],
    },
  },
  // A hopeful double hop, offering the gift.
  "gift-in-hands": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 4500,
      y: [
        [0, 0],
        [160, 0],
        [340, -0.07],
        [520, 0],
        [680, -0.045],
        [840, 0],
      ],
      scaleY: [
        [0, 0],
        [160, -0.07],
        [340, 0.05],
        [520, -0.06],
        [680, 0.03],
        [840, -0.03],
        [1000, 0],
      ],
      scaleX: [
        [0, 0],
        [160, 0.05],
        [340, -0.03],
        [520, 0.045],
        [680, -0.02],
        [840, 0.02],
        [1000, 0],
      ],
    },
  },
  // Shrug: pops up, tilts its head, drops back with a squish.
  "empty-hands-shrug": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 4000,
      y: [
        [0, 0],
        [180, -0.035],
        [520, -0.035],
        [700, 0],
      ],
      scaleY: [
        [0, 0],
        [180, 0.05],
        [520, 0.05],
        [700, -0.05],
        [850, 0.015],
        [1000, 0],
      ],
      scaleX: [
        [0, 0],
        [180, -0.03],
        [520, -0.03],
        [700, 0.04],
        [850, -0.01],
        [1000, 0],
      ],
      rotate: [
        [0, 0],
        [180, 0],
        [350, -3],
        [520, 0],
      ],
    },
  },
  // Scans the page left, then right.
  "magnifying-glass": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 4800,
      x: [
        [0, 0],
        [500, -0.05],
        [900, -0.05],
        [1500, 0.05],
        [1900, 0.05],
        [2400, 0],
      ],
      rotate: [
        [0, 0],
        [500, -4],
        [900, -4],
        [1500, 4],
        [1900, 4],
        [2400, 0],
      ],
    },
  },
  // Reads the map side to side, then a little "found it" hop.
  "explorer-map": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 5200,
      x: [
        [0, 0],
        [600, -0.015],
        [1400, -0.015],
        [2000, 0.015],
        [2800, 0.015],
        [3400, 0],
      ],
      rotate: [
        [0, 0],
        [600, -5],
        [1400, -5],
        [2000, 5],
        [2800, 5],
        [3400, 0],
      ],
      y: [
        [0, 0],
        [3400, 0],
        [3550, -0.035],
        [3700, 0],
      ],
      scaleY: [
        [0, 0],
        [3300, 0],
        [3400, -0.04],
        [3550, 0.03],
        [3700, -0.02],
        [3850, 0],
      ],
    },
  },
  // Snoring: slow, deep breaths while z's drift up.
  "sleeping-bell": {
    entrance: "pop",
    breath: { duration: 2600, amount: 0.045 },
    move: { duration: 3600 },
    zzz: true,
  },
  // "Aha!": a jump while the bulb flares up.
  "lightbulb-idea": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 4500,
      y: [
        [0, 0],
        [150, 0],
        [330, -0.08],
        [520, 0],
      ],
      scaleY: [
        [0, 0],
        [150, -0.07],
        [330, 0.06],
        [520, -0.05],
        [680, 0.02],
        [820, 0],
      ],
      scaleX: [
        [0, 0],
        [150, 0.05],
        [330, -0.04],
        [520, 0.04],
        [680, -0.01],
        [820, 0],
      ],
      rotate: [
        [0, 0],
        [150, 0],
        [330, 3],
        [520, 0],
      ],
      glow: [
        [0, 0.3],
        [250, 0.3],
        [400, 1],
        [1400, 0.7],
        [2600, 0.3],
      ],
    },
  },
  // Rocks on its feet under the weight of the sack.
  "santa-sack": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 3600,
      rotate: [
        [0, -4],
        [1800, 4],
        [3600, -4],
      ],
      y: [
        [0, -0.01],
        [900, 0.005],
        [1800, -0.01],
        [2700, 0.005],
        [3600, -0.01],
      ],
    },
  },
  // A proud wiggle; the key catches the light.
  "holding-key": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 4200,
      rotate: [
        [0, 0],
        [150, -4],
        [300, 4],
        [450, -3],
        [600, 2],
        [750, 0],
      ],
      scaleY: [
        [0, 0],
        [150, 0.03],
        [750, 0],
      ],
      sparkleA: [
        [0, 0],
        [250, 0],
        [500, 1],
        [800, 0],
      ],
      sparkleB: [
        [0, 0],
        [2100, 0],
        [2350, 1],
        [2650, 0],
      ],
    },
  },
  // Drops in, then nods twice at the sign-in buttons below.
  "happy-pointing-down": {
    entrance: "drop",
    breath: BREATH,
    move: {
      duration: 2600,
      y: [
        [0, 0],
        [220, 0.035],
        [440, 0],
        [660, 0.035],
        [880, 0],
      ],
      scaleY: [
        [0, 0],
        [220, -0.03],
        [440, 0],
        [660, -0.03],
        [880, 0],
      ],
      scaleX: [
        [0, 0],
        [220, 0.02],
        [440, 0],
        [660, 0.02],
        [880, 0],
      ],
    },
  },
  // A friendly sway, as if waving hello.
  "welcome-wave": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 3200,
      rotate: [
        [0, 0],
        [400, -3],
        [800, 2],
        [1200, -2],
        [1600, 0],
      ],
    },
  },
  // A small, happy hop.
  "excited-cheer": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 3000,
      y: [
        [0, 0],
        [260, -0.03],
        [520, 0],
      ],
      scaleY: [
        [0, 0],
        [260, 0.02],
        [520, 0],
      ],
    },
  },
  // Giggles behind its hands.
  "hands-over-eyes": {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 2400,
      rotate: [
        [0, 0],
        [150, -2],
        [300, 2],
        [450, -1],
        [600, 0],
      ],
    },
  },
  // Leans in for a sneaky look, holds it, leans back.
  peeking: {
    entrance: "pop",
    breath: BREATH,
    move: {
      duration: 3600,
      rotate: [
        [0, 0],
        [600, -3],
        [1800, -3],
        [2400, 0],
      ],
    },
  },
};

// The feet sit at ~86% of every canvas: squash, stretch and rocking pivot there.
const FEET_ORIGIN = "50% 86%";

// Bulb and key positions in the artwork, as fractions of the canvas.
const BULB = { x: 0.81, y: 0.19, size: 0.5 };
const SPARKLES = [
  { x: 0.31, y: 0.57, size: 0.13 },
  { x: 0.69, y: 0.6, size: 0.1 },
];
const ZZZ = { x: 0.7, y: 0.2, count: 3 };

function sample(frames: Keyframes | undefined, ms: number) {
  "worklet";
  if (!frames || frames.length === 0) return 0;
  let prev = frames[0]!;
  if (ms <= prev[0]) return prev[1];
  for (let i = 1; i < frames.length; i++) {
    const next = frames[i]!;
    if (ms <= next[0]) {
      const t = (ms - prev[0]) / (next[0] - prev[0]);
      return prev[1] + (next[1] - prev[1]) * t * t * (3 - 2 * t);
    }
    prev = next;
  }
  return prev[1];
}

function instant(value: number, delay: number) {
  return withDelay(delay, withTiming(value, { duration: 0 }));
}

export function AnimatedMascot({
  variant,
  size,
  subtle = false,
  skipEntrance = false,
  accessibilityLabel,
}: {
  variant: MascotVariant;
  size: number;
  /** Smaller moves, for compact placements. */
  subtle?: boolean;
  /** Start in place, for a mascot swapped in for another one already on screen. */
  skipEntrance?: boolean;
  accessibilityLabel?: string;
}) {
  const motion = MOTIONS[variant];
  const blinkSource = BLINK_IMAGES[variant];
  const reduceMotion = useReducedMotion();
  // Mascots on the launch screen mount under the splash overlay: hold the entrance until
  // the user can actually see it.
  const appReady = useAppReady();
  const focused = useIsFocused();
  const intensity = subtle ? 0.6 : 1;

  const enter = useSharedValue(skipEntrance ? 1 : 0);
  const breath = useSharedValue(0);
  const clock = useSharedValue(0);
  const blink = useSharedValue(0);
  const poke = useSharedValue(0);

  // Entrance plays once, when the mascot first becomes visible.
  useEffect(() => {
    if (skipEntrance) return;
    if (reduceMotion) {
      cancelAnimation(enter);
      enter.set(1);
      return;
    }
    if (appReady) enter.set(withSpring(1, { damping: 11, stiffness: 170 }));
  }, [appReady, enter, reduceMotion, skipEntrance]);

  // Idle loops run only while their screen is showing: tabs and stacked screens stay
  // mounted, and every animated frame costs a UI-thread commit.
  const looping = appReady && focused && !reduceMotion;
  useEffect(() => {
    if (!looping) {
      for (const value of [breath, clock, blink]) cancelAnimation(value);
      // Rest pose, so the mascot never comes back frozen mid-move.
      breath.set(0);
      clock.set(0);
      blink.set(0);
      return;
    }

    breath.set(
      withRepeat(
        withTiming(1, { duration: motion.breath.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    clock.set(
      withRepeat(
        withTiming(motion.move.duration, { duration: motion.move.duration, easing: Easing.linear }),
        -1,
      ),
    );
    if (blinkSource) {
      // A single blink, then a double one, so it never feels metronomic.
      blink.set(
        withRepeat(
          withSequence(
            instant(1, 2600),
            instant(0, 120),
            instant(1, 3400),
            instant(0, 110),
            instant(1, 150),
            instant(0, 110),
          ),
          -1,
        ),
      );
    }

    return () => {
      for (const value of [breath, clock, blink]) cancelAnimation(value);
    };
  }, [blink, blinkSource, breath, clock, looping, motion]);

  function handlePress() {
    hapticPoke();
    if (reduceMotion) return;
    poke.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withSpring(0, { stiffness: 280, damping: 5, mass: 0.6 }),
      ),
    );
  }

  const outerStyle = useAnimatedStyle(() => {
    const e = enter.get();
    const p = poke.get();
    const entrance =
      motion.entrance === "drop"
        ? [{ translateY: (e - 1) * 0.35 * size }]
        : [{ translateY: (1 - e) * 0.08 * size }, { scale: 0.6 + 0.4 * e }];
    return {
      opacity: Math.min(1, e * 1.5),
      transform: [...entrance, { scaleX: 1 + 0.14 * p }, { scaleY: 1 - 0.14 * p }],
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const ms = clock.get();
    const b = breath.get() * motion.breath.amount;
    const { move } = motion;
    return {
      transform: [
        { translateX: sample(move.x, ms) * size * intensity },
        { translateY: sample(move.y, ms) * size * intensity },
        { rotate: `${sample(move.rotate, ms) * intensity}deg` },
        { scaleX: 1 + (sample(move.scaleX, ms) * intensity - b / 2) },
        { scaleY: 1 + (sample(move.scaleY, ms) * intensity + b) },
      ],
    };
  });

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.get() }));

  return (
    <Pressable accessible={false} onPress={handlePress}>
      <Animated.View
        style={[{ height: size, width: size, transformOrigin: FEET_ORIGIN }, outerStyle]}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { transformOrigin: FEET_ORIGIN }, bodyStyle]}
        >
          {motion.move.glow ? (
            <BulbGlow
              clock={clock}
              frames={motion.move.glow}
              size={size}
              reduceMotion={reduceMotion}
            />
          ) : null}
          <Image
            source={MASCOT_IMAGES[variant]}
            accessibilityElementsHidden={!accessibilityLabel}
            accessibilityLabel={accessibilityLabel}
            contentFit="contain"
            style={StyleSheet.absoluteFill}
          />
          {blinkSource ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, blinkStyle]}>
              <Image source={blinkSource} contentFit="contain" style={StyleSheet.absoluteFill} />
            </Animated.View>
          ) : null}
          {motion.move.sparkleA ? (
            <Sparkle clock={clock} frames={motion.move.sparkleA} size={size} spot={SPARKLES[0]!} />
          ) : null}
          {motion.move.sparkleB ? (
            <Sparkle clock={clock} frames={motion.move.sparkleB} size={size} spot={SPARKLES[1]!} />
          ) : null}
        </Animated.View>
        {motion.zzz && !reduceMotion
          ? Array.from({ length: ZZZ.count }, (_, index) => (
              <Snore
                key={index}
                clock={clock}
                index={index}
                loop={motion.move.duration}
                size={size}
              />
            ))
          : null}
      </Animated.View>
    </Pressable>
  );
}

function BulbGlow({
  clock,
  frames,
  size,
  reduceMotion,
}: {
  clock: SharedValue<number>;
  frames: Keyframes;
  size: number;
  reduceMotion: boolean;
}) {
  const diameter = BULB.size * size;
  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.3 : sample(frames, clock.get()),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: BULB.x * size - diameter / 2,
          top: BULB.y * size - diameter / 2,
          height: diameter,
          width: diameter,
        },
        style,
      ]}
    >
      <Svg height={diameter} width={diameter}>
        <Defs>
          <RadialGradient id="bulb-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFD54A" stopOpacity={0.85} />
            <Stop offset="0.45" stopColor="#FFD54A" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFD54A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={diameter / 2} cy={diameter / 2} r={diameter / 2} fill="url(#bulb-glow)" />
      </Svg>
    </Animated.View>
  );
}

function Sparkle({
  clock,
  frames,
  size,
  spot,
}: {
  clock: SharedValue<number>;
  frames: Keyframes;
  size: number;
  spot: (typeof SPARKLES)[number];
}) {
  const extent = spot.size * size;
  const style = useAnimatedStyle(() => {
    const s = sample(frames, clock.get());
    return { opacity: s, transform: [{ scale: s }, { rotate: `${s * 90}deg` }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: spot.x * size - extent / 2,
          top: spot.y * size - extent / 2,
          height: extent,
          width: extent,
        },
        style,
      ]}
    >
      <Svg height={extent} width={extent} viewBox="0 0 24 24">
        <Path
          d="M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z"
          fill="#FFF6C8"
          stroke="#E8A800"
          strokeWidth={1}
        />
      </Svg>
    </Animated.View>
  );
}

function Snore({
  clock,
  index,
  loop,
  size,
}: {
  clock: SharedValue<number>;
  index: number;
  loop: number;
  size: number;
}) {
  const fontSize = size * (0.1 + index * 0.025);
  const style = useAnimatedStyle(() => {
    // Each z runs the same rise, offset by a third of the loop.
    const t = ((clock.get() + (index * loop) / ZZZ.count) % loop) / loop;
    return {
      opacity: t < 0.2 ? t / 0.2 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1,
      transform: [
        { translateX: (t * 0.14 + Math.sin(t * Math.PI * 2) * 0.02) * size },
        { translateY: -t * 0.26 * size },
        { scale: 0.6 + t * 0.6 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: ZZZ.x * size, top: ZZZ.y * size - fontSize }, style]}
    >
      <Text
        className="font-extrabold text-text-muted"
        style={{ fontSize, lineHeight: fontSize * 1.2 }}
      >
        z
      </Text>
    </Animated.View>
  );
}
