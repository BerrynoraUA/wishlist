import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentlyFocusedInput: vi.fn(), dismiss: vi.fn() }));
vi.mock("react-native", () => ({
  TextInput: { State: { currentlyFocusedInput: mocks.currentlyFocusedInput } },
  Keyboard: { dismiss: mocks.dismiss },
}));

import { resetFilters } from "./reset-filters";

function input(focused: boolean) {
  return { isFocused: () => focused, clear: vi.fn(), blur: vi.fn() };
}

describe("resetFilters", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears the focused filter before blur can commit its old text", () => {
    let nativeText = "birthday";
    let search = nativeText;
    const filter = input(true);
    filter.clear.mockImplementation(() => {
      nativeText = "";
    });
    filter.blur.mockImplementation(() => {
      expect(nativeText).toBe("");
      search = nativeText;
    });
    const onReset = vi.fn(() => {
      expect(filter.blur).toHaveBeenCalledOnce();
      search = "";
    });

    resetFilters(onReset, [filter]);

    expect(filter.clear).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(search).toBe("");
  });

  it("only clears the focused input within the supplied filter inputs", () => {
    const search = input(false);
    const priceMin = input(true);
    const priceMax = input(false);
    const onReset = vi.fn();

    resetFilters(onReset, [search, priceMin, priceMax]);

    expect(search.clear).not.toHaveBeenCalled();
    expect(priceMin.clear).toHaveBeenCalledOnce();
    expect(priceMin.blur).toHaveBeenCalledOnce();
    expect(priceMax.clear).not.toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("leaves a globally focused editor outside the filters untouched", () => {
    const editor = input(true);
    mocks.currentlyFocusedInput.mockReturnValue(editor);
    const filter = input(false);
    const onReset = vi.fn();

    resetFilters(onReset, [filter]);

    expect(editor.clear).not.toHaveBeenCalled();
    expect(editor.blur).not.toHaveBeenCalled();
    expect(mocks.dismiss).not.toHaveBeenCalled();
    expect(filter.clear).not.toHaveBeenCalled();
    expect(filter.blur).not.toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("resets when filter inputs are unmounted", () => {
    const onReset = vi.fn();
    resetFilters(onReset, [null]);
    expect(onReset).toHaveBeenCalledOnce();
  });
});
