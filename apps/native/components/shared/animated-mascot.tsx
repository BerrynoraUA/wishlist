import { useAppReady } from "@/components/splash/animated-splash";
import { hapticPoke } from "@/lib/haptics";
import { useReducedMotion } from "@/lib/motion";
import {
  type BakedLayer,
  type BakedMascot,
  bakeMascot,
  MASCOT_CANVAS,
  MASCOT_ENTRANCE_MS,
  MASCOT_FEET,
  type MascotLayer,
  type MascotVariant,
} from "@wishlist/mascot";
import { Image, type ImageSource } from "expo-image";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useUniwind } from "uniwind";
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

export type { MascotVariant };

const MASCOT_ATLASES: Record<MascotVariant, ImageSource> = {
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

/** What every layer needs to draw and move itself. */
type Scene = {
  baked: BakedMascot;
  clock: SharedValue<number>;
  source: ImageSource;
  /** Screen points per canvas unit. */
  unit: number;
  dark: boolean;
  onSpriteLoad: () => void;
};

const isHalo = (layer: MascotLayer) => /halo$/i.test(layer.id);

function countSprites(layers: readonly MascotLayer[], dark: boolean): number {
  return layers.reduce((total, layer) => {
    if (isHalo(layer) && !dark) return total;
    return total + (layer.box ? 1 : 0) + countSprites(layer.children ?? [], dark);
  }, 0);
}

/** If an image never reports in, show the mascot anyway rather than leave a hole. */
const LOAD_FALLBACK_MS = 1500;

function sampleAt(table: number[] | undefined, position: number, fallback: number) {
  "worklet";
  if (!table) return fallback;
  const index = Math.floor(position);
  const from = table[index] ?? fallback;
  const to = table[index + 1] ?? from;
  return from + (to - from) * (position - index);
}

function useLayerStyle(tracks: BakedLayer, { baked, clock, unit }: Scene) {
  const { duration, frames } = baked;
  return useAnimatedStyle(() => {
    const position = (clock.get() / duration) * frames;
    return {
      opacity: sampleAt(tracks.opacity, position, 1),
      transform: [
        { translateX: sampleAt(tracks.x, position, 0) * unit },
        { translateY: sampleAt(tracks.y, position, 0) * unit },
        { rotate: `${sampleAt(tracks.rotate, position, 0)}deg` },
        { scaleX: sampleAt(tracks.sx, position, 1) },
        { scaleY: sampleAt(tracks.sy, position, 1) },
      ],
    };
  }, [duration, frames, tracks, unit]);
}

function AnimatedLayer({
  tracks,
  pivot,
  scene,
  children,
}: {
  tracks: BakedLayer;
  pivot: readonly number[];
  scene: Scene;
  children: React.ReactNode;
}) {
  const style = useLayerStyle(tracks, scene);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { transformOrigin: [pivot[0]! * scene.unit, pivot[1]! * scene.unit, 0] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Layer({ layer, scene }: { layer: MascotLayer; scene: Scene }) {
  const { baked, source, unit, dark, onSpriteLoad } = scene;
  // A soft pale edge, because the art's dark outline disappears on a dark screen.
  if (isHalo(layer) && !dark) return null;
  const content = (
    <>
      {layer.box && layer.atlas ? (
        <View
          style={{
            position: "absolute",
            left: layer.box[0]! * unit,
            top: layer.box[1]! * unit,
            width: layer.box[2]! * unit,
            height: layer.box[3]! * unit,
            overflow: "hidden",
          }}
        >
          <Image
            source={source}
            contentFit="fill"
            onLoad={onSpriteLoad}
            style={{
              position: "absolute",
              left: -layer.atlas[0]! * unit,
              top: -layer.atlas[1]! * unit,
              width: baked.layout.atlas[0]! * unit,
              height: baked.layout.atlas[1]! * unit,
            }}
          />
        </View>
      ) : null}
      {layer.children?.map((child) => (
        <Layer key={child.id} layer={child} scene={scene} />
      ))}
    </>
  );
  const tracks = baked.layers[layer.id];
  if (!tracks) return <View style={StyleSheet.absoluteFill}>{content}</View>;
  return (
    <AnimatedLayer tracks={tracks} pivot={layer.pivot} scene={scene}>
      {content}
    </AnimatedLayer>
  );
}

export function AnimatedMascot({
  variant,
  size,
  skipEntrance = false,
  accessibilityLabel,
}: {
  variant: MascotVariant;
  size: number;
  /** Start in place, for a mascot swapped in for another one already on screen. */
  skipEntrance?: boolean;
  accessibilityLabel?: string;
}) {
  const baked = bakeMascot(variant);
  const { theme } = useUniwind();
  const dark = theme === "dark";
  const reduceMotion = useReducedMotion();
  // Mascots on the launch screen mount under the splash overlay: hold the entrance until
  // the user can actually see it.
  const appReady = useAppReady();
  const focused = useIsFocused();

  // Every layer is its own image view, so they can finish loading at different moments. The
  // mascot stays hidden until they all have, so its parts never pop in one by one.
  const [loaded, setLoaded] = useState(false);
  const spritesLeft = useRef(0);
  spritesLeft.current ||= countSprites(baked.layout.layers, dark);
  function handleSpriteLoad() {
    spritesLeft.current -= 1;
    if (spritesLeft.current <= 0) setLoaded(true);
  }
  useEffect(() => {
    const fallback = setTimeout(() => setLoaded(true), LOAD_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, []);
  const visible = useSharedValue(0);
  useEffect(() => {
    if (loaded) visible.set(withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }));
  }, [loaded, visible]);

  const enter = useSharedValue(skipEntrance ? 1 : 0);
  const clock = useSharedValue(baked.still);
  const poke = useSharedValue(0);

  // Entrance plays once, when the mascot first becomes visible.
  useEffect(() => {
    if (skipEntrance) return;
    if (reduceMotion) {
      cancelAnimation(enter);
      enter.set(1);
      return;
    }
    if (appReady && loaded) enter.set(withSpring(1, { damping: 11, stiffness: 170 }));
  }, [appReady, enter, loaded, reduceMotion, skipEntrance]);

  // The loop runs only while its screen is showing: tabs and stacked screens stay mounted,
  // and every animated frame costs a UI-thread commit.
  const looping = appReady && focused && loaded && !reduceMotion;
  useEffect(() => {
    if (!looping) {
      cancelAnimation(clock);
      // The finished drawing, so the mascot never comes back frozen mid-move.
      clock.set(baked.still);
      return;
    }
    clock.set(0);
    // The action waits for the entrance to land, so the two don't blur together.
    clock.set(
      withDelay(
        skipEntrance ? 0 : MASCOT_ENTRANCE_MS,
        withRepeat(
          withTiming(baked.duration, { duration: baked.duration, easing: Easing.linear }),
          -1,
        ),
      ),
    );
    return () => cancelAnimation(clock);
  }, [baked, clock, looping, skipEntrance]);

  function handlePress() {
    hapticPoke();
    if (reduceMotion) return;
    poke.set(
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, { stiffness: 280, damping: 5, mass: 0.6 }),
      ),
    );
  }

  const unit = size / MASCOT_CANVAS;
  const feetOrigin = [MASCOT_FEET[0] * unit, MASCOT_FEET[1] * unit, 0];

  // Read out here, so the worklet doesn't capture all of the baked tables.
  const drops = baked.entrance === "drop";
  const outerStyle = useAnimatedStyle(() => {
    const e = enter.get();
    const p = poke.get();
    const entrance = drops
      ? [{ translateY: (e - 1) * 0.35 * size }]
      : [{ translateY: (1 - e) * 0.08 * size }, { scale: 0.6 + 0.4 * e }];
    return {
      opacity: Math.min(1, e * 1.5) * visible.get(),
      transform: [...entrance, { scaleX: 1 + 0.14 * p }, { scaleY: 1 - 0.14 * p }],
    };
  });

  const scene: Scene = {
    baked,
    clock,
    source: MASCOT_ATLASES[variant],
    unit,
    dark,
    onSpriteLoad: handleSpriteLoad,
  };
  const [scale, fitX, fitY] = baked.layout.fit;

  return (
    <Pressable accessible={false} onPress={handlePress}>
      <Animated.View
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel ? "image" : undefined}
        style={[{ height: size, width: size, transformOrigin: feetOrigin }, outerStyle]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              transformOrigin: [0, 0, 0],
              transform: [
                { translateX: fitX! * unit },
                { translateY: fitY! * unit },
                { scale: scale! },
              ],
            },
          ]}
        >
          <AnimatedLayer tracks={baked.layers.root ?? {}} pivot={MASCOT_FEET} scene={scene}>
            {baked.layout.layers.map((layer) => (
              <Layer key={layer.id} layer={layer} scene={scene} />
            ))}
          </AnimatedLayer>
        </View>
      </Animated.View>
    </Pressable>
  );
}
