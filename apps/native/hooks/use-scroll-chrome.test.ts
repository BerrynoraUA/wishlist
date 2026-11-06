import { describe, expect, it } from "vitest";
import { advanceBackButtonScroll } from "./use-scroll-chrome";

function scrollThrough(...offsets: number[]) {
  return offsets.reduce(advanceBackButtonScroll, { anchorY: 0, hidden: false });
}

describe("back button scroll", () => {
  it("leaves on a deliberate scroll down", () => {
    expect(scrollThrough(40).hidden).toBe(true);
  });

  it("stays put for a finger resting on the list", () => {
    expect(scrollThrough(6).hidden).toBe(false);
  });

  it("returns on a deliberate scroll up from the furthest point", () => {
    expect(scrollThrough(300, 600, 590).hidden).toBe(true);
    expect(scrollThrough(300, 600, 580).hidden).toBe(false);
  });

  it("is always there at the top of the list", () => {
    expect(scrollThrough(300, 0).hidden).toBe(false);
  });
});
