// What each mascot pose does, and why. See ../MOTION.md for the rules these follow.
//
// A pose is a set of tracks: for a layer from layout.generated.ts, a function from time (ms)
// to a value. Offsets are in canvas units (640 wide), rotation in degrees, scales are factors.
// "root" moves the whole mascot around its feet.

export type Channel = "x" | "y" | "rotate" | "sx" | "sy" | "opacity";
type Fn = (t: number) => number;
type Tracks = Partial<Record<Channel, Fn>>;
type Keys = readonly (readonly [number, number])[];

export type MascotMotion = {
  duration: number;
  /** The moment shown with reduced motion. Must read as the finished drawing. */
  still?: number;
  /** "drop" comes in from above, for a pose that points down at something. */
  entrance?: "pop" | "drop";
  tracks: Record<string, Tracks>;
};

/** Passes through every key with a continuous speed and never overshoots one. */
function flow(keys: Keys): Fn {
  const n = keys.length;
  const slope = (j: number) => (keys[j + 1]![1] - keys[j]![1]) / (keys[j + 1]![0] - keys[j]![0]);
  const tangent = (j: number) => {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1);
    const b = slope(j);
    if (a * b <= 0) return 0;
    const h0 = keys[j]![0] - keys[j - 1]![0];
    const h1 = keys[j + 1]![0] - keys[j]![0];
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  };
  return (t) => {
    if (t <= keys[0]![0]) return keys[0]![1];
    if (t >= keys[n - 1]![0]) return keys[n - 1]![1];
    let i = 0;
    while (keys[i + 1]![0] < t) i++;
    const h = keys[i + 1]![0] - keys[i]![0];
    const s = (t - keys[i]![0]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * keys[i]![1] +
      (s3 - 2 * s2 + s) * h * tangent(i) +
      (-2 * s3 + 3 * s2) * keys[i + 1]![1] +
      (s3 - s2) * h * tangent(i + 1)
    );
  };
}

/**
 * How many times longer a loop is than its action. The big move plays when the mascot appears
 * and then it only breathes, blinks and glances: on a screen you stay on, a move that repeats
 * every few seconds stops being charming and starts nagging.
 */
const QUIET = 3;

const sum =
  (...fns: Fn[]): Fn =>
  (t) =>
    fns.reduce((total, fn) => total + fn(t), 0);

/** A delayed copy: how trailing parts follow what they hang from. */
const after =
  (fn: Fn, ms: number, duration: number, strength = 1): Fn =>
  (t) =>
    fn((t - ms + duration) % duration) * strength;

/** Quick eyes close fast, hold a moment and open slower. A plain flow would flicker. */
function blinks(duration: number, ...times: number[]): Fn {
  const keys: [number, number][] = [[0, 1]];
  // The quiet stretch keeps blinking, at uneven gaps, with a double one now and then.
  const gaps = [3400, 4300, 3000];
  const quiet: number[] = [];
  for (let at = duration / QUIET + 900, i = 0; at < duration - 1200; at += gaps[i++ % 3]!) {
    quiet.push(at);
    if (i % 3 === 1) quiet.push(at + 430);
  }
  for (const at of [...times, ...quiet]) {
    keys.push([at, 1], [at + 110, 0.02], [at + 150, 0.02], [at + 340, 1]);
  }
  keys.push([1e6, 1]);
  return flow(keys);
}

/** The curved closed lid takes over as the eye squashes shut, so it never reads as a flat line. */
const lidOf =
  (blink: Fn): Fn =>
  (t) =>
    Math.min(1, Math.max(0, (0.4 - blink(t)) / 0.25));

const openOf =
  (blink: Fn): Fn =>
  (t) =>
    1 - lidOf(blink)(t);

/** The gaze: keys are [ms, x, y]. Pupils lead, and the whole face turns after them. */
function gaze(looks: readonly (readonly [number, number, number])[], duration: number, blink: Fn) {
  const lookX = flow(looks.map(([ms, x]) => [ms, x]));
  const lookY = flow(looks.map(([ms, , y]) => [ms, y]));
  return {
    pupilL: { x: lookX, y: lookY },
    pupilR: { x: lookX, y: lookY },
    eyeL: { sy: blink, opacity: openOf(blink) },
    eyeR: { sy: blink, opacity: openOf(blink) },
    closedL: { opacity: lidOf(blink) },
    closedR: { opacity: lidOf(blink) },
    face: { x: after(lookX, 130, duration, 0.75), y: after(lookY, 130, duration, 0.45) },
  };
}

/** Runs `cycles` times per action length, so the seam never shows, and starts from zero. */
function idle(duration: number, loops = QUIET) {
  return (amount: number, cycles: number, phase = 0): Fn =>
    (t) =>
      amount *
      (Math.sin(2 * Math.PI * ((loops * cycles * t) / duration + phase)) -
        Math.sin(2 * Math.PI * phase));
}

/** Breathing keeps its volume: taller means narrower. */
function breathing(duration: number, cycles: number, amount = 0.012, keys?: Fn) {
  const breath = idle(duration)(amount, cycles);
  return {
    sy: (t: number) => 1 + breath(t) + (keys ? keys(t) : 0),
    sx: (t: number) => 1 / (1 + breath(t) + (keys ? keys(t) : 0)) ** 0.6,
  };
}

const one =
  (fn: Fn): Fn =>
  (t) =>
    1 + fn(t);

function welcomeWave(): MascotMotion {
  // Hello: the hand really waves, with the little motion ticks only while it does.
  const D = 6000 * QUIET;
  const w = idle(D);
  const wave = flow([
    [0, 0],
    [280, -6],
    [620, 18],
    [960, -7],
    [1300, 18],
    [1640, -6],
    [1980, 12],
    [2420, 0],
    [D, 0],
  ]);
  const lean = flow([
    [0, 0],
    [620, -1.6],
    [1980, -1.4],
    [2700, 0],
    [D, 0],
  ]);
  const up = flow([
    [0, 0],
    [500, -7],
    [2000, -6],
    [2600, 0],
    [D, 0],
  ]);
  const ticks = flow([
    [0, 1],
    [2200, 1],
    [2600, 0],
    [D - 600, 0],
    [D, 1],
  ]);
  return {
    duration: D,
    tracks: {
      root: { ...breathing(D, 2), rotate: sum(lean, w(0.4, 1)) },
      shackle: { y: after(up, 120, D, 0.4), rotate: after(lean, 140, D, -0.8) },
      arm: { rotate: sum(wave, w(1.4, 3, 0.2)) },
      ticks: {
        opacity: ticks,
        rotate: after(wave, 60, D, 0.9),
        sx: (t) => 0.75 + 0.25 * ticks(t),
        sy: (t) => 0.75 + 0.25 * ticks(t),
      },
      browL: { y: up },
      browR: { y: after(up, 50, D) },
      mouth: { sy: one(after(up, 40, D, -0.025)), sx: one(after(up, 40, D, -0.01)) },
      ...gaze(
        [
          [0, 0, 0],
          [3100, 0, 0],
          [3550, -2, 8],
          [4500, -2, 8],
          [4950, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 3000, 4850, 5280),
      ),
    },
  };
}

function excitedCheer(): MascotMotion {
  // Yay: two hops with the fists pumping in turn, the stars twinkling after each landing.
  const D = 4400 * QUIET;
  const w = idle(D);
  const hop = flow([
    [0, 0],
    [130, 0],
    [320, -30],
    [500, 0],
    [660, 0],
    [840, -20],
    [1010, 0],
    [D, 0],
  ]);
  const squash = flow([
    [0, 0],
    [130, -0.05],
    [320, 0.05],
    [500, -0.06],
    [660, -0.03],
    [840, 0.035],
    [1010, -0.04],
    [1250, 0],
    [D, 0],
  ]);
  const pumpL = flow([
    [0, 0],
    [320, 16],
    [600, -5],
    [860, 11],
    [1250, 0],
    [D, 0],
  ]);
  const pumpR = flow([
    [0, 0],
    [200, 5],
    [440, -16],
    [720, 4],
    [980, -11],
    [1350, 0],
    [D, 0],
  ]);
  const twinkle = (from: number) =>
    flow([
      [0, 0],
      [from, 0],
      [from + 160, 0.3],
      [from + 520, 0],
      [D, 0],
    ]);
  const starL = twinkle(420);
  const starR = twinkle(950);
  return {
    duration: D,
    tracks: {
      root: { y: hop, ...breathing(D, 3, 0.012, squash) },
      shackle: { y: after(hop, 70, D, -0.35) },
      armL: { rotate: sum(pumpL, w(2, 3, 0.1)) },
      armR: { rotate: sum(pumpR, w(2, 2, 0.6)) },
      starL: { sx: one(starL), sy: one(starL), rotate: (t) => starL(t) * 60 },
      starR: { sx: one(starR), sy: one(starR), rotate: (t) => starR(t) * -60 },
      browL: { y: after(hop, 60, D, 0.28) },
      browR: { y: after(hop, 90, D, 0.28) },
      mouth: { sy: one(after(hop, 40, D, -0.006)), sx: one(after(squash, 40, D, 0.8)) },
      ...gaze(
        [
          [0, 0, 0],
          [1500, 0, 0],
          [1900, -7, -5],
          [2500, -7, -5],
          [2950, 7, -5],
          [3500, 7, -5],
          [3950, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 1420, 2860, 3880),
      ),
    },
  };
}

function happyPointingDown(): MascotMotion {
  // "Down here!": both fingers jab at the buttons below, and the eyes check them, then you.
  const D = 5200 * QUIET;
  const w = idle(D);
  const jab = flow([
    [0, 0],
    [500, 0],
    [660, -4],
    [860, 15],
    [1090, 2],
    [1300, 15],
    [1640, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    entrance: "drop",
    tracks: {
      root: { ...breathing(D, 3), y: after(jab, 40, D, 0.22) },
      handL: { y: sum(jab, w(1.5, 2)), rotate: sum(after(jab, 30, D, -0.16), w(0.8, 3, 0.2)) },
      handR: {
        y: sum(after(jab, 70, D), w(1.5, 2, 0.4)),
        rotate: sum(after(jab, 100, D, 0.16), w(0.8, 2, 0.7)),
      },
      browL: { y: after(jab, 80, D, 0.25) },
      browR: { y: after(jab, 110, D, 0.25) },
      mouth: { sy: one(after(jab, 40, D, 0.006)) },
      ...gaze(
        [
          [0, 0, 0],
          [250, 0, 0],
          [620, -1, 9],
          [1900, -1, 9],
          [2350, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 2240, 4200),
      ),
    },
  };
}

function handsOverEyes(): MascotMotion {
  // "I'm not looking!": giggles behind its hands, which never open up.
  const D = 3800 * QUIET;
  const w = idle(D);
  const giggleOn = flow([
    [0, 0],
    [350, 0],
    [550, 1],
    [1500, 1],
    [1900, 0],
    [D, 0],
  ]);
  const shake = (phase: number): Fn => {
    const beat = idle(D)(1, 15, phase);
    return (t) => beat(t) * giggleOn(t);
  };
  const press = flow([
    [0, 0],
    [2300, 0],
    [2700, 1],
    [3100, 1],
    [3500, 0],
    [D, 0],
  ]);
  const a = shake(0);
  const b = shake(0.5);
  return {
    duration: D,
    tracks: {
      root: { ...breathing(D, 2), rotate: (t) => a(t) * 0.9, y: (t) => Math.abs(a(t)) * -3 },
      handL: { rotate: sum((t) => a(t) * 1.4, w(0.7, 2)), x: (t) => press(t) * 3 },
      handR: { rotate: sum((t) => b(t) * 1.4, w(0.7, 3, 0.3)), x: (t) => press(t) * -3 },
      mouth: {
        sy: (t) => 1 + 0.13 * Math.abs(a(t)) + 0.04 * press(t),
        sx: (t) => 1 + 0.03 * Math.abs(b(t)),
      },
      browL: { y: (t) => a(t) * 1.8 - 3 * giggleOn(t) },
      browR: { y: (t) => b(t) * 1.8 - 3 * giggleOn(t) },
    },
  };
}

function peeking(): MascotMotion {
  // Sneaks a look past one lowered hand, at the password field below, then at you.
  const D = 4600 * QUIET;
  const w = idle(D);
  const dip = flow([
    [0, 0],
    [400, 0],
    [800, 1],
    [2800, 1],
    [3400, 0],
    [D, 0],
  ]);
  const blink = blinks(D, 760, 3100);
  return {
    duration: D,
    tracks: {
      root: { ...breathing(D, 3), rotate: sum((t) => dip(t) * -1.6, w(0.3, 2)) },
      handL: { y: sum((t) => dip(t) * 9, w(1, 3)), rotate: (t) => dip(t) * -3 },
      handR: { rotate: w(0.7, 2, 0.3) },
      mouth: { sx: (t) => 1 + 0.05 * dip(t), sy: (t) => 1 + 0.06 * dip(t) },
      browL: { y: (t) => dip(t) * -5 },
      browR: { y: after((t) => dip(t) * -2, 90, D) },
      pupilL: {
        x: flow([
          [0, 0],
          [800, 0],
          [1050, 8],
          [1700, 8],
          [1950, -6],
          [2600, -6],
          [2900, 0],
          [D, 0],
        ]),
        y: flow([
          [0, 0],
          [800, 0],
          [1050, 7],
          [1700, 7],
          [1950, 2],
          [2900, 0],
          [D, 0],
        ]),
      },
      eyeL: { sy: blink, opacity: openOf(blink) },
      closedL: { opacity: lidOf(blink) },
    },
  };
}

function sadAlone(): MascotMotion {
  // Alone: looks one way, then the other. Nobody's there, so it sighs and sinks.
  const D = 8000 * QUIET;
  const w = idle(D);
  const sigh = flow([
    [0, 0],
    [3600, 0],
    [4300, 1],
    [6400, 1],
    [7500, 0],
    [D, 0],
  ]);
  const inhale = flow([
    [0, 0],
    [3500, 0],
    [3950, 1],
    [4500, 0],
    [D, 0],
  ]);
  const heavy = flow([
    [0, 1],
    [4300, 1],
    [4800, 0.82],
    [6400, 0.82],
    [7000, 1],
    [D, 1],
  ]);
  const blink = blinks(D, 650, 1900, 7000);
  const closeSlow = flow([
    [0, 1],
    [5200, 1],
    [5500, 0.07],
    [5750, 0.07],
    [6200, 1],
    [D, 1],
  ]);
  const eyes: Fn = (t) => Math.min(blink(t), heavy(t), closeSlow(t));
  return {
    duration: D,
    tracks: {
      root: {
        ...breathing(D, 3, 0.008, (t) => 0.018 * inhale(t) - 0.03 * sigh(t)),
        y: (t) => -3 * inhale(t) + 7 * sigh(t),
        rotate: (t) => -1.4 * sigh(t),
      },
      browL: { rotate: (t) => 6 * sigh(t), y: (t) => 3 * sigh(t) },
      browR: { rotate: (t) => -6 * sigh(t), y: (t) => 3 * sigh(t) },
      mouth: { sx: (t) => 1 - 0.1 * sigh(t), y: sum((t) => 2 * sigh(t), w(0.5, 5)) },
      ...gaze(
        [
          [0, 0, 0],
          [350, 0, 0],
          [850, -9, -2],
          [1700, -9, -2],
          [2300, 9, -2],
          [3200, 9, -2],
          [3700, 0, 2],
          [4400, 0, 9],
          [6500, 0, 9],
          [7300, 0, 0],
          [D, 0, 0],
        ],
        D,
        eyes,
      ),
    },
  };
}

function giftInHands(): MascotMotion {
  // Nothing on the list yet: peeks in the empty box, jiggles its flap, then looks up, hopeful.
  const D = 7000 * QUIET;
  const w = idle(D);
  const flap = flow([
    [0, 0],
    [700, 0],
    [1000, -11],
    [1300, 4],
    [1600, -7],
    [1900, 2],
    [2250, 0],
    [D, 0],
  ]);
  const offer = flow([
    [0, 0],
    [2700, 0],
    [3200, 1],
    [4700, 1],
    [5400, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    tracks: {
      root: {
        ...breathing(D, 3),
        rotate: sum(after(flap, 50, D, 0.12), w(0.3, 2)),
        y: (t) => -6 * offer(t),
      },
      lid: { rotate: sum(flap, w(1.2, 5)) },
      browL: { y: (t) => -5 * offer(t) },
      browR: { y: (t) => -5 * offer(t) },
      mouth: { sx: (t) => 1 + 0.14 * offer(t), sy: (t) => 1 + 0.14 * offer(t) },
      ...gaze(
        [
          [0, 0, 0],
          [350, 0, 0],
          [750, 3, 9],
          [2400, 3, 9],
          [2900, 0, -4],
          [5000, 0, -4],
          [5500, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 2800, 4250, 4680),
      ),
    },
  };
}

function magnifyingGlass(): MascotMotion {
  // Searching: the lens sweeps out and across the face, the eyes hunting after it. No luck.
  const D = 6400 * QUIET;
  const w = idle(D);
  const sweep = flow([
    [0, 0],
    [300, 0],
    [950, -7],
    [1600, -7],
    [2500, 9],
    [3200, 9],
    [3900, 0],
    [D, 0],
  ]);
  const across = flow([
    [0, 0],
    [950, -6],
    [1600, -6],
    [2500, 26],
    [3200, 26],
    [3900, 0],
    [D, 0],
  ]);
  const shrug = flow([
    [0, 0],
    [4100, 0],
    [4450, 1],
    [5000, 1],
    [5500, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    tracks: {
      root: {
        ...breathing(D, 3),
        rotate: sum(after(sweep, 100, D, 0.28), (t) => -1.8 * shrug(t)),
      },
      glass: { rotate: sum(sweep, w(0.7, 4)), x: across, y: w(1.5, 3) },
      mouth: { sx: (t) => 1 - 0.1 * shrug(t) },
      ...gaze(
        [
          [0, 0, 0],
          [300, 0, 0],
          [850, -9, 0],
          [1650, -9, 0],
          [2400, 7, 3],
          [3250, 7, 3],
          [3900, 0, -2],
          [5400, 0, -2],
          [5900, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 2100, 3850, 5700),
      ),
    },
  };
}

function explorerMap(): MascotMotion {
  // Discover: reads the map line by line, rustles it, and lowers it to look at you.
  const D = 7000 * QUIET;
  const w = idle(D);
  const rustle = flow([
    [0, 0],
    [2900, 0],
    [3050, -1.6],
    [3200, 1.3],
    [3350, -0.8],
    [3550, 0],
    [D, 0],
  ]);
  const lower = flow([
    [0, 0],
    [3800, 0],
    [4300, 1],
    [5500, 1],
    [6200, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    tracks: {
      root: { ...breathing(D, 3), rotate: sum((t) => lower(t) * 0.8, w(0.3, 2)) },
      map: {
        rotate: sum(rustle, w(0.5, 3)),
        y: sum(
          (t) => lower(t) * 8,
          w(1.2, 4),
          (t) => Math.abs(rustle(t)) * -3,
        ),
      },
      mouth: { sy: (t) => 1 + 0.08 * lower(t) },
      ...gaze(
        [
          [0, 0, 0],
          [250, 0, 0],
          [600, -8, 8],
          [1200, -8, 8],
          [1650, 7, 9],
          [2300, 7, 9],
          [2550, -6, 9],
          [3100, -6, 9],
          [3500, 5, 8],
          [3900, 5, 8],
          [4400, 0, -2],
          [5600, 0, -2],
          [6100, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 1420, 4100, 6000),
      ),
    },
  };
}

function sleepingBell(): MascotMotion {
  // No notifications, so everyone's asleep: slow breaths, the bell rocking with them.
  const D = 5400;
  const w = idle(D, 1);
  const rise = (index: number) => (t: number) => ((t + (index * D) / 3) % D) / D;
  const fade = (p: number) => Math.min(1, p / 0.2) * Math.min(1, Math.max(0, (0.85 - p) / 0.25));
  const z = (index: number): Tracks => {
    const p = rise(index);
    return {
      x: (t) => p(t) * 62 + 10 * Math.sin(p(t) * Math.PI * 2),
      y: (t) => p(t) * -118,
      sx: (t) => 0.42 + 0.55 * p(t),
      sy: (t) => 0.42 + 0.55 * p(t),
      rotate: (t) => -10 + 20 * p(t),
      opacity: (t) => fade(p(t)),
    };
  };
  const breath = idle(D, 1)(1, 1, 0.75);
  return {
    duration: D,
    tracks: {
      root: {
        sy: (t) => 1 + 0.018 * breath(t),
        sx: (t) => 1 - 0.011 * breath(t),
        rotate: (t) => 0.5 * breath(t),
      },
      bell: { rotate: after(w(2, 1, 0.75), 300, D) },
      lidL: { sy: (t) => 1 + 0.05 * breath(t) },
      lidR: { sy: (t) => 1 + 0.05 * breath(t) },
      mouth: { sy: (t) => 1 + 0.2 * breath(t), sx: (t) => 1 - 0.05 * breath(t) },
      z1: z(0),
      z2: z(1),
      z3: z(2),
    },
  };
}

function lightbulbIdea(): MascotMotion {
  // Aha: stares at the dark bulb, it flickers on, and the whole body jumps at the idea.
  const D = 6600 * QUIET;
  const w = idle(D);
  const off = flow([
    [0, 1],
    [1250, 1],
    [1320, 0.25],
    [1420, 0.9],
    [1520, 0.15],
    [1640, 0],
    [D - 1500, 0],
    [D - 800, 1],
    [D, 1],
  ]);
  const on = (t: number) => 1 - off(t);
  const pop = flow([
    [0, 0],
    [1500, 0],
    [1720, 1],
    [2050, 0],
    [D, 0],
  ]);
  const hop = flow([
    [0, 0],
    [1420, 0],
    [1640, -26],
    [1850, 0],
    [D, 0],
  ]);
  const squash = flow([
    [0, 0],
    [1420, -0.05],
    [1640, 0.05],
    [1850, -0.055],
    [2100, 0],
    [D, 0],
  ]);
  const raise = flow([
    [0, 7],
    [1300, 7],
    [1650, -3],
    [2100, 0],
    [D - 1500, 0],
    [D - 800, 7],
    [D, 7],
  ]);
  return {
    duration: D,
    still: 3200,
    tracks: {
      root: { y: hop, ...breathing(D, 3, 0.012, squash) },
      armGroup: { rotate: sum(raise, w(1, 3)) },
      bulb: {
        y: (t) => 10 * off(t) + 2.5 * w(1, 3)(t),
        sx: (t) => 0.95 + 0.05 * on(t) + 0.07 * pop(t),
        sy: (t) => 0.95 + 0.05 * on(t) + 0.07 * pop(t),
      },
      bulbOff: { opacity: off },
      glow: {
        opacity: (t) => on(t) * (0.8 + 0.1 * w(1, 4)(t)),
        sx: (t) => 0.8 + 0.2 * on(t) + 0.2 * pop(t),
        sy: (t) => 0.8 + 0.2 * on(t) + 0.2 * pop(t),
      },
      rays: {
        opacity: on,
        y: (t) => 10 * off(t),
        sx: (t) => 0.72 + 0.28 * on(t) + 0.14 * pop(t),
        sy: (t) => 0.72 + 0.28 * on(t) + 0.14 * pop(t),
      },
      mouth: { sy: (t) => 1 + 0.35 * pop(t), sx: (t) => 1 + 0.1 * pop(t) },
      ...gaze(
        [
          [0, 9, -8],
          [2300, 9, -8],
          [2700, 0, 0],
          [D - 1700, 0, 0],
          [D - 1100, 9, -8],
          [D, 9, -8],
        ],
        D,
        blinks(D, 800, 2560, 4500),
      ),
    },
  };
}

function santaSack(): MascotMotion {
  // A sack this full is heavy: it heaves it up and lets it thump down, pompom swinging after.
  const D = 5400 * QUIET;
  const w = idle(D);
  const heave = flow([
    [0, 0],
    [500, 2],
    [950, -11],
    [1350, -9],
    [1620, 1],
    [1820, 0],
    [D, 0],
  ]);
  const thump = flow([
    [0, 0],
    [1500, 0],
    [1640, 1],
    [1950, 0],
    [D, 0],
  ]);
  const swing = flow([
    [0, 0],
    [950, -5],
    [1500, 2],
    [1800, -15],
    [2200, 11],
    [2650, -6],
    [3100, 3],
    [3600, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    tracks: {
      root: {
        ...breathing(D, 3, 0.012, (t) => -0.02 * thump(t)),
        rotate: sum(after(heave, 60, D, 0.2), w(0.3, 2)),
      },
      sack: {
        y: heave,
        rotate: after(heave, 40, D, 0.14),
        sy: (t) => 1 - 0.035 * thump(t),
        sx: (t) => 1 + 0.03 * thump(t),
      },
      pom: { rotate: sum(swing, w(2, 3, 0.2)) },
      mouth: {
        sx: flow([
          [0, 1],
          [600, 1],
          [950, 0.84],
          [1400, 0.84],
          [1800, 1.1],
          [2500, 1],
          [D, 1],
        ]),
      },
      ...gaze(
        [
          [0, 0, 0],
          [300, 0, 0],
          [700, 8, 8],
          [1700, 8, 8],
          [2150, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 1640, 3500, 3880),
      ),
    },
  };
}

function holdingKey(): MascotMotion {
  // Access: turns the key, and the padlock's own shackle clicks open, then shuts again.
  const D = 6000 * QUIET;
  const w = idle(D);
  const turn = flow([
    [0, 0],
    [500, 0],
    [950, -5],
    [1250, 3.5],
    [1500, 0],
    [D, 0],
  ]);
  const open = flow([
    [0, 0],
    [1250, 0],
    [1480, -20],
    [3200, -20],
    [3560, 1.5],
    [3700, 0],
    [D, 0],
  ]);
  const spark = (at: number) =>
    flow([
      [0, 0],
      [at, 0],
      [at + 170, 1],
      [at + 560, 0],
      [D, 0],
    ]);
  const a = spark(1350);
  const b = spark(1800);
  const star = (fn: Fn, turnBy: number): Tracks => ({
    opacity: (t) => Math.min(1, fn(t) * 1.4),
    sx: fn,
    sy: fn,
    rotate: (t) => fn(t) * turnBy,
  });
  return {
    duration: D,
    tracks: {
      root: { ...breathing(D, 3), y: after(open, 60, D, 0.15), rotate: w(0.3, 2) },
      shackle: { y: sum(open, w(0.6, 3)) },
      key: { rotate: sum(turn, w(0.5, 3)), y: w(1.2, 4, 0.2) },
      sparkA: star(a, 24),
      sparkB: star(b, -24),
      mouth: { sy: (t) => 1 + 0.012 * -open(t), sx: (t) => 1 + 0.004 * -open(t) },
      ...gaze(
        [
          [0, 0, 0],
          [200, 0, 0],
          [600, -2, 9],
          [1500, -2, 9],
          [1950, 0, -6],
          [3050, 0, -6],
          [3500, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 1430, 3400, 5200),
      ),
    },
  };
}

function emptyHandsShrug(): MascotMotion {
  // "No idea": a real shrug. Hands come up, the head tips, then it all drops with a settle.
  const D = 5200 * QUIET;
  const w = idle(D);
  const shrug = flow([
    [0, 0],
    [400, 0],
    [800, 1],
    [1700, 1],
    [2050, -0.08],
    [2350, 0],
    [D, 0],
  ]);
  return {
    duration: D,
    tracks: {
      root: {
        ...breathing(D, 3, 0.012, (t) => 0.02 * shrug(t)),
        y: (t) => -7 * shrug(t),
        rotate: sum((t) => -2.4 * shrug(t), w(0.3, 2)),
      },
      armL: {
        rotate: sum(
          after((t) => 15 * shrug(t), 50, D),
          w(1.4, 3),
        ),
        y: (t) => -7 * shrug(t),
      },
      armR: {
        rotate: sum(
          after((t) => -15 * shrug(t), 90, D),
          w(1.4, 2, 0.4),
        ),
        y: (t) => -7 * shrug(t),
      },
      mouth: { sx: (t) => 1 - 0.14 * shrug(t), sy: (t) => 1 - 0.1 * shrug(t) },
      ...gaze(
        [
          [0, 0, 0],
          [350, 0, 0],
          [750, -8, -6],
          [1750, -8, -6],
          [2300, 0, 0],
          [D, 0, 0],
        ],
        D,
        blinks(D, 340, 2200, 4100),
      ),
    },
  };
}

export const MASCOT_MOTION = {
  "welcome-wave": welcomeWave(),
  "excited-cheer": excitedCheer(),
  "happy-pointing-down": happyPointingDown(),
  "hands-over-eyes": handsOverEyes(),
  peeking: peeking(),
  "sad-alone": sadAlone(),
  "gift-in-hands": giftInHands(),
  "magnifying-glass": magnifyingGlass(),
  "explorer-map": explorerMap(),
  "sleeping-bell": sleepingBell(),
  "lightbulb-idea": lightbulbIdea(),
  "santa-sack": santaSack(),
  "holding-key": holdingKey(),
  "empty-hands-shrug": emptyHandsShrug(),
} satisfies Record<string, MascotMotion>;

export type MascotVariant = keyof typeof MASCOT_MOTION;
