import { describe, expect, it } from "vitest";
import { getItemReservationState, getSalePercentOff, parseItemPriceToNumber } from "./items";

describe("item domain helpers", () => {
  it.each([
    ["EUR 1,234.50", 1234.5],
    ["19,99", 19.99],
    ["", null],
    ["not a price", null],
  ])("normalizes %s", (input, expected) => {
    expect(parseItemPriceToNumber(input)).toBe(expected);
  });

  it("only returns meaningful sale percentages", () => {
    expect(getSalePercentOff("100", "75")).toBe(25);
    expect(getSalePercentOff("100", "110")).toBeNull();
    expect(getSalePercentOff("100", "75", false)).toBeNull();
  });

  it("prevents another user from replacing an existing reservation", () => {
    expect(
      getItemReservationState({
        status: 1,
        reservedBy: "other-user",
        currentUserId: "current-user",
      }),
    ).toMatchObject({
      isReserved: true,
      reservedByMe: false,
      canToggleReservation: false,
      canToggleBought: false,
    });
  });

  it("lets the owner reserve an item nobody has taken", () => {
    expect(
      getItemReservationState({
        status: 0,
        reservedBy: null,
        currentUserId: "owner",
      }),
    ).toMatchObject({
      canToggleReservation: true,
      canToggleBought: true,
    });
  });
});
