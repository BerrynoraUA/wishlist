import { SecretSantaPersonAvatar } from "@/components/secret-santa/secret-santa-person-avatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { hapticLongPress, hapticSelection, hapticSuccess } from "@/lib/haptics";
import { getSecretSantaPersonName } from "@/lib/secret-santa";
import { useReducedMotion } from "@/lib/motion";
import type { SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
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

/** Timeline, in ms from mount. */
const DROP_AT = 150;
const DRUMROLL_AT = 750;
const POP_AT = 1800;
const TITLE_AT = POP_AT + 250;
const CARD_AT = POP_AT + 650;
const BUTTON_AT = POP_AT + 1400;
const RAIN_AT = POP_AT + 900;
const CLOCK_MS = RAIN_AT + 5200;
const CLOSE_MS = 220;

const GIFT_SIZE = 160;
const STAGE_HEIGHT = 220;
const CONFETTI_COLORS = [
  "#FF4D8D",
  "#FFC83D",
  "#7C5CFF",
  "#2DD4BF",
  "#60A5FA",
  "#FB7185",
  "#FFFFFF",
  "#A3E635",
];
const GOLD = "#FFD166";

type Particle = {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  delay: number;
  life: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  rotation: number;
  spin: number;
  flip: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
};

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)]!;
}

function particleShape() {
  const kind = Math.random();
  if (kind < 0.5) {
    const width = random(7, 11);
    return { width, height: width * random(1.3, 1.8), radius: 2 };
  }
  if (kind < 0.75) {
    const size = random(7, 10);
    return { width: size, height: size, radius: size / 2 };
  }
  return { width: random(3.5, 5), height: random(20, 28), radius: 2 };
}

function makeParticle(
  overrides: Pick<Particle, "x0" | "y0" | "vx" | "vy" | "delay"> & Partial<Particle>,
): Particle {
  return {
    ...particleShape(),
    drag: random(1.4, 2.2),
    gravity: random(850, 1100),
    life: random(2600, 3600),
    color: pick(CONFETTI_COLORS),
    rotation: random(0, 360),
    spin: random(-540, 540),
    flip: random(360, 900),
    swayAmp: random(4, 14),
    swayFreq: random(3, 7),
    phase: random(0, Math.PI * 2),
    ...overrides,
  };
}

/**
 * Three waves: a burst out of the gift, two cannons from the bottom corners, and a slow
 * shower from the top that keeps the screen festive while the match card is read.
 */
function buildConfetti(width: number, height: number, originY: number): Particle[] {
  const particles: Particle[] = [];

  for (let index = 0; index < 56; index += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;
    const speed = random(450, 1150);
    particles.push(
      makeParticle({
        x0: width / 2,
        y0: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        delay: POP_AT + random(0, 60),
      }),
    );
  }

  for (const side of [-1, 1]) {
    for (let index = 0; index < 36; index += 1) {
      const angle = -Math.PI / 2 - side * random(0.2, 0.7);
      const speed = random(1300, 2050);
      particles.push(
        makeParticle({
          x0: side < 0 ? 0 : width,
          y0: height + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: random(1000, 1250),
          life: random(3000, 3800),
          delay: POP_AT + 120 + random(0, 220),
        }),
      );
    }
  }

  for (let index = 0; index < 40; index += 1) {
    particles.push(
      makeParticle({
        x0: random(0, width),
        y0: -30,
        vx: random(-40, 40),
        vy: random(60, 180),
        drag: 0.7,
        gravity: random(180, 260),
        life: random(4200, 5000),
        swayAmp: random(20, 45),
        swayFreq: random(1.5, 3),
        delay: RAIN_AT + random(0, 1600),
      }),
    );
  }

  return particles;
}

function ConfettiPiece({ particle, clock }: { particle: Particle; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const elapsed = clock.value - particle.delay;
    if (elapsed <= 0 || elapsed >= particle.life) return { opacity: 0 };

    // Linear air drag: the piece shoots out fast, slows down and settles into a terminal
    // fall speed instead of accelerating forever.
    const t = elapsed / 1000;
    const k = particle.drag;
    const decay = (1 - Math.exp(-k * t)) / k;
    const terminal = particle.gravity / k;
    const x =
      particle.vx * decay + particle.swayAmp * Math.sin(t * particle.swayFreq + particle.phase);
    const y = terminal * t + (particle.vy - terminal) * decay;
    const lifeProgress = elapsed / particle.life;

    return {
      opacity: lifeProgress > 0.75 ? (1 - lifeProgress) / 0.25 : 1,
      transform: [
        { perspective: 600 },
        { translateX: x },
        { translateY: y },
        { rotate: `${particle.rotation + particle.spin * t}deg` },
        { rotateX: `${particle.flip * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: particle.x0 - particle.width / 2,
          top: particle.y0 - particle.height / 2,
          width: particle.width,
          height: particle.height,
          borderRadius: particle.radius,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

function LightRays({ size }: { size: number }) {
  const center = size / 2;
  const rays = 14;
  const halfWidth = (Math.PI / rays) * 0.45;
  const paths = Array.from({ length: rays }, (_, index) => {
    const angle = (index / rays) * Math.PI * 2;
    const x1 = center + Math.cos(angle - halfWidth) * center;
    const y1 = center + Math.sin(angle - halfWidth) * center;
    const x2 = center + Math.cos(angle + halfWidth) * center;
    const y2 = center + Math.sin(angle + halfWidth) * center;
    return `M${center} ${center} L${x1} ${y1} L${x2} ${y2} Z`;
  });

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={GOLD} stopOpacity={0.55} />
          <Stop offset="0.6" stopColor={GOLD} stopOpacity={0.12} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF4D6" stopOpacity={0.55} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {paths.map((d) => (
        <Path key={d} d={d} fill="url(#ray)" />
      ))}
      <Circle cx={center} cy={center} r={center * 0.45} fill="url(#glow)" />
    </Svg>
  );
}

const STAR_PATH = "M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z";

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0.15, { duration: 620, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.6 }, { rotate: `${progress.value * 45}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: x - size / 2, top: y - size / 2 }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR_PATH} fill={GOLD} />
      </Svg>
    </Animated.View>
  );
}

/** Fluent Emoji "Wrapped gift" 3D (MIT, microsoft/fluentui-emoji), recolored pink with a gold ribbon. */
const GIFT_IMAGE = require("@/assets/images/secret-santa/gift.png");
/** Where the lid ends in the artwork, as a fraction of its height. */
const GIFT_LID_RATIO = 0.43;

/**
 * The present is one image shown twice: the top slice is the lid with the bow, the bottom
 * slice the box, so the lid can fly off on its own.
 */
function Gift({
  lidY,
  lidRotate,
  lidOpacity,
}: {
  lidY: SharedValue<number>;
  lidRotate: SharedValue<number>;
  lidOpacity: SharedValue<number>;
}) {
  const lidHeight = Math.round(GIFT_SIZE * GIFT_LID_RATIO);
  const lidStyle = useAnimatedStyle(() => ({
    opacity: lidOpacity.value,
    transform: [{ translateY: lidY.value }, { rotate: `${lidRotate.value}deg` }],
  }));

  return (
    <View style={{ width: GIFT_SIZE, height: GIFT_SIZE }}>
      <View
        style={{
          position: "absolute",
          top: lidHeight,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <Image
          source={GIFT_IMAGE}
          style={{ position: "absolute", top: -lidHeight, width: GIFT_SIZE, height: GIFT_SIZE }}
        />
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: lidHeight,
            overflow: "hidden",
          },
          lidStyle,
        ]}
      >
        <Image source={GIFT_IMAGE} style={{ width: GIFT_SIZE, height: GIFT_SIZE }} />
      </Animated.View>
    </View>
  );
}

/**
 * Full-screen celebration played right after the organizer draws names: the present drops
 * in, shakes through a haptic drumroll, bursts open into light rays and confetti cannons,
 * and flips over the organizer's own match.
 */
export function SecretSantaLaunchCelebration({
  receiver,
  onClose,
}: {
  receiver?: SecretSantaPerson | null;
  onClose: () => void;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const stageTop = Math.round(height * 0.2);
  const giftCenterY = stageTop + STAGE_HEIGHT / 2;
  const particles = React.useMemo(
    () => buildConfetti(width, height, giftCenterY),
    [giftCenterY, height, width],
  );
  const raysSize = Math.max(width, height) * 1.1;

  const clock = useSharedValue(0);
  const root = useSharedValue(0);
  const giftY = useSharedValue(-height * 0.6);
  const giftRotate = useSharedValue(0);
  const giftScale = useSharedValue(1);
  const giftOpacity = useSharedValue(1);
  const lidY = useSharedValue(0);
  const lidRotate = useSharedValue(0);
  const lidOpacity = useSharedValue(1);
  const flash = useSharedValue(0);
  const rays = useSharedValue(0);
  const raysRotate = useSharedValue(0);
  const title = useSharedValue(0);
  const card = useSharedValue(0);
  const button = useSharedValue(0);
  const [closing, setClosing] = React.useState(false);
  const [interactive, setInteractive] = React.useState(false);

  React.useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    root.value = withTiming(1, { duration: 300 });
    clock.value = withTiming(CLOCK_MS, { duration: CLOCK_MS, easing: Easing.linear });

    giftY.value = withDelay(DROP_AT, withSpring(0, { damping: 11, stiffness: 120, mass: 0.9 }));

    // Drumroll: the present shakes harder and faster until it can't hold the surprise in.
    const shakes = Array.from({ length: 14 }, (_, index) =>
      withTiming((index % 2 === 0 ? 1 : -1) * (3 + index * 0.75), {
        duration: 90 - index * 3,
        easing: Easing.inOut(Easing.quad),
      }),
    );
    giftRotate.value = withDelay(
      DRUMROLL_AT,
      withSequence(...shakes, withTiming(0, { duration: 40 })),
    );
    giftScale.value = withSequence(
      withDelay(
        DRUMROLL_AT,
        withTiming(1.12, { duration: POP_AT - DRUMROLL_AT, easing: Easing.in(Easing.quad) }),
      ),
      withTiming(1.3, { duration: 110 }),
      withTiming(0.2, { duration: 260, easing: Easing.in(Easing.cubic) }),
    );
    giftOpacity.value = withDelay(POP_AT + 110, withTiming(0, { duration: 260 }));

    lidY.value = withDelay(POP_AT, withTiming(-height * 0.45, { duration: 750, easing: ease }));
    lidRotate.value = withDelay(POP_AT, withTiming(-48, { duration: 750, easing: ease }));
    lidOpacity.value = withDelay(POP_AT + 350, withTiming(0, { duration: 400 }));

    flash.value = withDelay(
      POP_AT,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }),
    );
    rays.value = withDelay(POP_AT, withTiming(1, { duration: 500 }));
    raysRotate.value = withDelay(
      POP_AT,
      withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false),
    );

    title.value = withDelay(TITLE_AT, withSpring(1, { damping: 9, stiffness: 140 }));
    card.value = withDelay(CARD_AT, withSpring(1, { damping: 13, stiffness: 110 }));
    button.value = withDelay(BUTTON_AT, withTiming(1, { duration: 400, easing: ease }));

    const ticks = [
      0, 150, 280, 390, 480, 560, 630, 690, 740, 785, 825, 860, 890, 915, 940, 960, 980,
    ];
    const timers = [
      ...ticks.map((offset) => setTimeout(hapticSelection, DRUMROLL_AT + offset)),
      setTimeout(hapticSuccess, POP_AT),
      setTimeout(hapticLongPress, POP_AT + 140),
      setTimeout(hapticLongPress, POP_AT + 300),
      setTimeout(hapticSelection, CARD_AT + 120),
      setTimeout(() => setInteractive(true), BUTTON_AT),
    ];

    return () => timers.forEach(clearTimeout);
    // Plays once per mount; the shared values are stable refs.
  }, []);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    root.value = withTiming(0, { duration: CLOSE_MS });
    setTimeout(onClose, CLOSE_MS);
  }

  const rootStyle = useAnimatedStyle(() => ({ opacity: root.value }));
  const giftStyle = useAnimatedStyle(() => ({
    opacity: giftOpacity.value,
    transform: [
      { translateY: giftY.value },
      { rotate: `${giftRotate.value}deg` },
      { scale: giftScale.value },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value === 0 ? 0 : 0.9 * (1 - flash.value),
    transform: [{ scale: 0.2 + flash.value * 7 }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: rays.value,
    transform: [{ rotate: `${raysRotate.value}deg` }, { scale: 0.6 + rays.value * 0.4 }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(title.value * 1.5, 1),
    transform: [{ translateY: (1 - title.value) * 24 }, { scale: 0.5 + title.value * 0.5 }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(card.value * 2, 1),
    transform: [
      { perspective: 900 },
      { rotateY: `${(1 - card.value) * 90}deg` },
      { scale: 0.7 + card.value * 0.3 },
    ],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: button.value,
    transform: [{ translateY: (1 - button.value) * 16 }],
  }));

  const sparkles = [
    { x: width / 2 - 140, y: stageTop + 30, size: 22 },
    { x: width / 2 + 135, y: stageTop + 50, size: 16 },
    { x: width / 2 - 110, y: stageTop + STAGE_HEIGHT - 10, size: 14 },
    { x: width / 2 + 120, y: stageTop + STAGE_HEIGHT - 30, size: 24 },
    { x: width / 2 - 60, y: stageTop - 14, size: 12 },
    { x: width / 2 + 70, y: stageTop - 4, size: 18 },
  ];

  return (
    <WindowOverlay onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, rootStyle]}>
        <View className="absolute inset-0 bg-black/80" />

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: width / 2 - raysSize / 2,
              top: giftCenterY - raysSize / 2,
            },
            raysStyle,
          ]}
        >
          <LightRays size={raysSize} />
        </Animated.View>

        {!reduceMotion
          ? sparkles.map((sparkle, index) => (
              <Sparkle key={index} {...sparkle} delay={TITLE_AT + index * 140} />
            ))
          : null}

        <View
          style={{ position: "absolute", top: stageTop, left: 0, right: 0, alignItems: "center" }}
        >
          <View
            style={{
              height: STAGE_HEIGHT,
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#FFF7E0",
                },
                flashStyle,
              ]}
            />
            <Animated.View pointerEvents="none" style={[{ position: "absolute" }, giftStyle]}>
              <Gift lidY={lidY} lidRotate={lidRotate} lidOpacity={lidOpacity} />
            </Animated.View>

            <Animated.View style={cardStyle}>
              <View className="w-64 items-center gap-2 rounded-3xl border border-white/20 bg-card-bg px-5 py-6 shadow-lg">
                {receiver ? (
                  <>
                    <Text className="text-xs font-extrabold uppercase tracking-widest text-brand">
                      {t("Your Secret Santa match")}
                    </Text>
                    <View className="rounded-full border-4 border-brand-lighter">
                      <SecretSantaPersonAvatar person={receiver} sizeClassName="size-20" />
                    </View>
                    <Text
                      className="text-center text-xl font-extrabold text-text"
                      numberOfLines={2}
                    >
                      {getSecretSantaPersonName(receiver, t)}
                    </Text>
                    {receiver.nickname ? (
                      <Text className="text-sm text-text-muted" numberOfLines={1}>
                        @{receiver.nickname}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text className="text-5xl">🎁</Text>
                    <Text className="text-center text-base font-extrabold text-text">
                      {t("Matches are ready.")}
                    </Text>
                  </>
                )}
              </View>
            </Animated.View>
          </View>

          <Animated.View className="mt-8 items-center gap-2 px-8" style={titleStyle}>
            <Text className="text-center text-3xl font-extrabold text-white">
              {t("Names are drawn!")}
            </Text>
            <Text className="text-center text-base text-white/80">
              {receiver
                ? t("Time to find the perfect gift.")
                : t("Everyone got their Secret Santa match.")}
            </Text>
          </Animated.View>

          <Animated.View
            className="mt-8 w-full px-8"
            pointerEvents={interactive ? "auto" : "none"}
            style={buttonStyle}
          >
            <Button size="lg" className="h-12 rounded-full" onPress={handleClose}>
              <Text className="text-base font-extrabold">{t("Let's go!")}</Text>
            </Button>
          </Animated.View>
        </View>

        {!reduceMotion
          ? particles.map((particle, index) => (
              <ConfettiPiece key={index} particle={particle} clock={clock} />
            ))
          : null}
      </Animated.View>
    </WindowOverlay>
  );
}
