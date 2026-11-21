import { describe, expect, it } from "vitest";
import { bakeMascot, layerIds } from "./bake";
import { MASCOT_MOTION, type MascotVariant } from "./motion";

const variants = Object.keys(MASCOT_MOTION) as MascotVariant[];

describe.each(variants)("%s", (variant) => {
  const baked = bakeMascot(variant);

  it("only moves layers the art has", () => {
    const known = new Set(["root", ...layerIds(baked.layout.layers)]);
    expect(Object.keys(baked.layers).filter((id) => !known.has(id))).toEqual([]);
  });

  it("closes its loop without a jump", () => {
    for (const [id, channels] of Object.entries(baked.layers)) {
      for (const [channel, table] of Object.entries(channels)) {
        const closes = Math.abs(table[0]! - table[table.length - 1]!) < 0.02;
        expect(closes, `${id}.${channel}`).toBe(true);
      }
    }
  });

  it("never teleports", () => {
    // Per 30 fps frame. The fastest honest moves are a blink and a hop.
    const limits = { x: 12, y: 12, rotate: 7, sx: 0.5, sy: 0.5, opacity: 0.5 };
    for (const [id, channels] of Object.entries(baked.layers)) {
      for (const [channel, table] of Object.entries(channels)) {
        // A part that's fully faded out may reset unseen, like a z starting its next rise.
        const shown = (i: number) => channels.opacity?.[i] !== 0 || channels.opacity?.[i + 1] !== 0;
        const steps = table.slice(1).map((v, i) => (shown(i) ? Math.abs(v - table[i]!) : 0));
        const biggest = Math.max(...steps);
        // A closed lid is part of a blink, the one move that's meant to be this fast.
        if (id.startsWith("closed") || (id.startsWith("eye") && channel === "opacity")) continue;
        expect(biggest, `${id}.${channel}`).toBeLessThan(limits[channel as keyof typeof limits]);
      }
    }
  });

  it("holds the finished drawing for reduced motion", () => {
    for (const [id, rest] of Object.entries(baked.rest)) {
      // Glow, sparkles and closed lids aren't in the art; the rest must sit where the art drew it.
      const extras = [
        "glow",
        "sparkA",
        "sparkB",
        "z1",
        "z2",
        "z3",
        "bulbOff",
        "closedL",
        "closedR",
      ];
      if (extras.includes(id)) continue;
      expect(Math.abs(rest.x), `${id}.x`).toBeLessThan(2.5);
      expect(Math.abs(rest.y), `${id}.y`).toBeLessThan(2.5);
      expect(Math.abs(rest.rotate), `${id}.rotate`).toBeLessThan(1.5);
      expect(Math.abs(rest.sy - 1), `${id}.sy`).toBeLessThan(0.03);
      expect(rest.opacity, `${id}.opacity`).toBe(1);
    }
  });
});
