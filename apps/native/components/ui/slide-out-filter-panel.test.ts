import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SharedValue } from "react-native-reanimated";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlideOutFilterPanel, SlideOutSpacer } from "./slide-out-filter-panel";

type ViewProps = {
  children?: ReactNode;
  style?: { height?: number };
  pointerEvents?: string;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: string;
  onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
};

const views = vi.hoisted(() => ({ animated: [] as ViewProps[], native: [] as ViewProps[] }));
const { mockShared } = vi.hoisted(() => ({
  mockShared: (initial: number) => {
    const sharedValue = {
      value: initial,
      get: () => sharedValue.value,
      set: (next: number) => {
        sharedValue.value = next;
      },
    };
    return sharedValue;
  },
}));

vi.mock("@/lib/motion", () => ({ useReducedMotion: () => false }));
vi.mock("expo-router", () => ({ useFocusEffect: vi.fn() }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  return {
    BackHandler: {},
    View: (props: ViewProps) => {
      views.native.push(props);
      return createElement("div", null, props.children);
    },
  };
});
vi.mock("react-native-reanimated", async () => {
  const { createElement } = await import("react");
  return {
    default: {
      View: (props: ViewProps) => {
        views.animated.push(props);
        return createElement("div", null, props.children);
      },
    },
    Easing: { bezier: vi.fn() },
    useSharedValue: (value: number) => mockShared(value),
    // Read styles again after layout/progress changes, as Reanimated does on the UI thread.
    useAnimatedStyle: (compute: () => Record<string, unknown>) =>
      new Proxy({}, { get: (_, key) => compute()[key as string] }),
  };
});

function shared(value: number) {
  return mockShared(value) as SharedValue<number>;
}

function measure(height: number) {
  views.native[0].onLayout!({ nativeEvent: { layout: { height } } });
}

describe("slide-out filter panel sizing", () => {
  beforeEach(() => {
    views.animated.length = 0;
    views.native.length = 0;
  });

  it.each([
    ["iOS Wishlists", 116, 132],
    ["Android Wishlists", 124, 140],
    ["iOS Discover", 172, 190],
    ["Android Discover", 184, 202],
  ])("fits measured %s controls and moves the list by the same amount", (_, estimate, actual) => {
    const height = shared(estimate);
    const progress = shared(1);
    renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(SlideOutFilterPanel, { open: true, progress, height, children: "filters" }),
        createElement(SlideOutSpacer, { progress, height }),
      ),
    );
    const panel = views.animated[0];
    const spacer = views.animated[2];

    measure(actual);

    expect(panel.style?.height).toBe(actual);
    expect(spacer.style?.height).toBe(actual);
    expect(height.value).toBe(actual);

    // Both opening and closing use the same progress and measured size.
    progress.value = 0.5;
    expect(panel.style?.height).toBe(actual / 2);
    expect(spacer.style?.height).toBe(actual / 2);
    progress.value = 0;
    expect(panel.style?.height).toBe(0);
    expect(spacer.style?.height).toBe(0);

    // A later layout change can grow or shrink the panel without leaving a stale spacer.
    measure(actual - 8);
    progress.value = 1;
    expect(panel.style?.height).toBe(actual - 8);
    expect(spacer.style?.height).toBe(actual - 8);
  });

  it("measures while closed without exposing hidden controls", () => {
    const height = shared(116);
    const progress = shared(0);
    renderToStaticMarkup(
      createElement(SlideOutFilterPanel, { open: false, progress, height, children: "filters" }),
    );

    measure(132);

    expect(height.value).toBe(132);
    expect(views.animated[0].style?.height).toBe(0);
    expect(views.animated[0].pointerEvents).toBe("none");
    expect(views.animated[0].accessibilityElementsHidden).toBe(true);
    expect(views.animated[0].importantForAccessibility).toBe("no-hide-descendants");
    progress.value = 1;
    expect(views.animated[0].style?.height).toBe(132);
  });

  it("keeps item-detail panels measuring their own content without a shared height", () => {
    renderToStaticMarkup(
      createElement(SlideOutFilterPanel, { open: true, progress: shared(1), children: "filters" }),
    );

    measure(190);

    expect(views.animated[0].style?.height).toBe(190);
    expect(views.animated[0].pointerEvents).toBe("auto");
    expect(views.animated[0].accessibilityElementsHidden).toBe(false);
    expect(views.animated[0].importantForAccessibility).toBe("auto");
  });
});
