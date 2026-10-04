import { describe, expect, it } from "vitest";
import { isNameBlocked } from "./blocked-names";

describe("isNameBlocked", () => {
  it.each([
    "nigger",
    "n1gg3r",
    "xx_nigga_xx",
    "whitepower",
    "white.power",
    "heil-hitler",
    "kkk_member",
    "alex1488",
    "wetback99",
    "coon",
    "c00ns",
    "the.spic",
    "jap-77",
    "kike99",
    "Nigga",
    "The Spic",
  ])("blocks %s", (name) => {
    expect(isNameBlocked(name)).toBe(true);
  });

  it.each([
    "valerii",
    "raccoon",
    "spicy.food",
    "japan_trip",
    "nigeria",
    "snickers",
    "dagobert",
    "pakistan",
    "kikeriki",
    "user123",
    "Valerii Inshyn",
  ])("allows %s", (name) => {
    expect(isNameBlocked(name)).toBe(false);
  });
});
