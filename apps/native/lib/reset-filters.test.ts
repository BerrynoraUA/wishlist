import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentlyFocusedInput: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("react-native", () => ({
  TextInput: { State: { currentlyFocusedInput: mocks.currentlyFocusedInput } },
  Keyboard: { dismiss: mocks.dismiss },
}));

import { resetFilters } from "./reset-filters";

describe("resetFilters", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears the native input before a keyboard dismissal can commit its text", () => {
    let nativeText = "birthday";
    let search = nativeText;
    const clear = vi.fn(() => {
      nativeText = "";
    });
    mocks.currentlyFocusedInput.mockReturnValue({ clear });
    mocks.dismiss.mockImplementation(() => {
      expect(nativeText).toBe("");
      search = nativeText;
    });
    const onReset = vi.fn(() => {
      expect(mocks.dismiss).toHaveBeenCalledOnce();
      search = "";
    });

    resetFilters(onReset);

    expect(clear).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(search).toBe("");
  });

  it("resets filters when no input is focused", () => {
    mocks.currentlyFocusedInput.mockReturnValue(null);
    const onReset = vi.fn();

    resetFilters(onReset);

    expect(mocks.dismiss).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });
});
