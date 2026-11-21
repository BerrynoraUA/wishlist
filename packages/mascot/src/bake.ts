import { MASCOT_LAYOUT } from "./layout.generated";
import { type Channel, MASCOT_MOTION, type MascotMotion, type MascotVariant } from "./motion";
import type { MascotLayer, MascotPoseLayout } from "./types";

export const MASCOT_CANVAS = 640;

/** How long a mascot waits for its entrance to land before it starts acting, in ms. */
export const MASCOT_ENTRANCE_MS = 600;

/** Where the whole mascot stands: "root" tracks turn and squash around this point. */
export const MASCOT_FEET = [320, 550] as const;

/** Sample spacing of baked tracks. Anything faster than this is linear between samples. */
export const BAKE_STEP = 1000 / 30;

const CHANNELS: readonly Channel[] = ["x", "y", "rotate", "sx", "sy", "opacity"];
const REST: Record<Channel, number> = { x: 0, y: 0, rotate: 0, sx: 1, sy: 1, opacity: 1 };

export type LayerTransform = Record<Channel, number>;
export type BakedLayer = Partial<Record<Channel, number[]>>;

export type BakedMascot = {
  duration: number;
  /** How many samples one loop has, not counting the closing one. */
  frames: number;
  /** The clock time reduced motion holds at. */
  still: number;
  entrance: "pop" | "drop";
  layout: MascotPoseLayout;
  layers: Record<string, BakedLayer>;
  /** Each animated layer's values at `still`: also the first paint, before any clock runs. */
  rest: Record<string, LayerTransform>;
};

const round = (value: number) => Math.round(value * 1000) / 1000;

const cache = new Map<MascotVariant, BakedMascot>();

/**
 * Turns a pose's tracks into plain number tables, which the web hands to the Animations API
 * and native reads from a worklet. It's the one place both platforms get their motion from.
 */
export function bakeMascot(variant: MascotVariant): BakedMascot {
  const cached = cache.get(variant);
  if (cached) return cached;

  const motion: MascotMotion = MASCOT_MOTION[variant];
  const { duration, tracks } = motion;
  const still = motion.still ?? 0;
  const frames = Math.round(duration / BAKE_STEP);
  const layers: Record<string, BakedLayer> = {};
  const rest: Record<string, LayerTransform> = {};
  for (const [id, channels] of Object.entries(tracks)) {
    const baked: BakedLayer = {};
    const values = { ...REST };
    for (const channel of CHANNELS) {
      const fn = channels[channel];
      if (!fn) continue;
      baked[channel] = Array.from({ length: frames + 1 }, (_, i) =>
        round(fn((i / frames) * duration)),
      );
      values[channel] = round(fn(still));
    }
    layers[id] = baked;
    rest[id] = values;
  }
  const layout = MASCOT_LAYOUT[variant];
  if (!layout) throw new Error(`No layout for mascot ${variant}`);
  // A swinging part's dark-theme edge moves exactly as the part does.
  for (const id of layerIds(layout.layers)) {
    const part = id.replace(/Halo$/, "");
    const tracksOfPart = layers[part];
    const restOfPart = rest[part];
    if (id !== part && tracksOfPart && restOfPart) {
      layers[id] = tracksOfPart;
      rest[id] = restOfPart;
    }
  }

  const result = {
    duration,
    frames,
    still,
    entrance: motion.entrance ?? "pop",
    layout,
    layers,
    rest,
  };
  cache.set(variant, result);
  return result;
}

export function layerIds(layers: readonly MascotLayer[]): string[] {
  return layers.flatMap((layer) => [layer.id, ...layerIds(layer.children ?? [])]);
}
