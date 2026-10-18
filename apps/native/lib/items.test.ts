import { describe, expect, it } from "vitest";
import { getItemReservationState, getSalePercentOff } from "./items";

describe("item domain helpers", () => {
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
