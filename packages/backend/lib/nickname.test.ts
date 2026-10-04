import { describe, expect, it } from "vitest";
import { isNicknameBlocked } from "./nickname";

describe("isNicknameBlocked", () => {
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
  ])("blocks %s", (nickname) => {
    expect(isNicknameBlocked(nickname)).toBe(true);
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
  ])("allows %s", (nickname) => {
    expect(isNicknameBlocked(nickname)).toBe(false);
  });
});
