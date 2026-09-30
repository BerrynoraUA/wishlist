// @vitest-environment jsdom
import { act, createElement, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { LayoutChangeEvent } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollableTabs } from "./scrollable-tabs";

const fixture = vi.hoisted(() => ({
  layouts: [] as ((event: LayoutChangeEvent) => void)[],
  scrollTo: vi.fn(),
  renders: 0,
}));

function MockView({
  children,
  onLayout,
}: {
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  if (onLayout) fixture.layouts.push(onLayout);
  return createElement("div", null, children);
}

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
  View: MockView,
  ScrollView: ({ ref, children }: { ref: Ref<unknown>; children?: ReactNode }) => {
    fixture.renders++;
    useImperativeHandle(ref, () => ({ scrollTo: fixture.scrollTo }));
    return createElement("div", null, children);
  },
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: MockView },
  Easing: { bezier: vi.fn() },
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useSharedValue: () =>
    useRef({
      get value(): number {
        throw new Error("Shared value read on JS thread");
      },
      set value(_value: number) {},
    }).current,
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
}));
vi.mock("@/lib/haptics", () => ({ hapticSelection: vi.fn() }));
vi.mock("@/lib/motion", () => ({
  useReducedMotion: () => false,
  motionSpring: { navPill: {} },
  liquidStretch: () => 0,
}));
vi.mock("@/components/ui/liquid-glass", () => ({ HAS_LIQUID_GLASS: false }));
vi.mock("@/components/ui/animated-pressable", () => ({ AnimatedPressable: MockView }));
vi.mock("@/components/ui/text", () => ({ Text: MockView }));
vi.mock("@/components/user-guide/guide-target", () => ({ GuideTarget: MockView }));

describe("tab viewport resizing", () => {
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    vi.clearAllMocks();
    fixture.layouts = [];
    fixture.renders = 0;
    root = createRoot(document.createElement("div"));
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
  });

  function render(value = "first") {
    fixture.layouts = [];
    act(() =>
      root.render(
        createElement(ScrollableTabs, {
          tabs: [
            { value: "first", label: "First" },
            { value: "second", label: "Second" },
          ],
          value,
          onChange: vi.fn(),
        }),
      ),
    );
  }
  function layout(index: number, width: number, x = 0) {
    act(() =>
      fixture.layouts[index]({
        nativeEvent: { layout: { width, x, y: 0, height: 44 } },
      } as LayoutChangeEvent),
    );
  }
  function advance(ms: number) {
    act(() => vi.advanceTimersByTime(ms));
  }
  function mount() {
    render();
    layout(0, 300);
    layout(1, 80, 200);
    layout(2, 80, 300);
    advance(20);
    fixture.scrollTo.mockClear();
  }

  it("coalesces resize frames without re-rendering and centers using the final width", () => {
    mount();
    const renders = fixture.renders;
    for (const width of [290, 280, 260]) {
      layout(0, width);
      advance(16);
    }
    expect(fixture.scrollTo).not.toHaveBeenCalled();
    expect(fixture.renders).toBe(renders);
    advance(100);
    expect(fixture.scrollTo).toHaveBeenCalledExactlyOnceWith({ x: 110, animated: false });
  });

  it("cancels a stale resize scroll when selection changes", () => {
    mount();
    layout(0, 260);
    render("second");
    advance(200);
    expect(fixture.scrollTo).toHaveBeenCalledExactlyOnceWith({ x: 210, animated: true });
  });

  it("cancels a pending resize scroll on unmount", () => {
    mount();
    layout(0, 260);
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    advance(200);
    expect(fixture.scrollTo).not.toHaveBeenCalled();
  });
});
