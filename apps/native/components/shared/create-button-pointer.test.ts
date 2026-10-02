// @vitest-environment jsdom
import { act, createElement, useImperativeHandle, type ReactNode, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { View } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateButtonPointer } from "./create-button-pointer";

const fixture = vi.hoisted(() => ({
  x: 16,
  y: 200,
  width: 368,
  height: 180,
  button: { x: 344, y: 740, radius: 26 },
  measureLayout: vi.fn((_screen: unknown, callback: (...rect: number[]) => void) => {
    callback(fixture.x, fixture.y, fixture.width, fixture.height);
  }),
  measureInWindow: vi.fn(),
  portal: vi.fn(),
}));

vi.mock("react-native", () => ({
  StyleSheet: { absoluteFill: { position: "absolute", inset: 0 } },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  View: ({
    ref,
    children,
    pointerEvents,
    style,
  }: {
    ref?: Ref<unknown>;
    children?: ReactNode;
    pointerEvents?: string;
    style?: object;
  }) => {
    useImperativeHandle(ref, () => ({
      measureLayout: fixture.measureLayout,
      measureInWindow: fixture.measureInWindow,
    }));
    return createElement("div", { "data-pointer-events": pointerEvents, style }, children);
  },
}));
vi.mock("react-native-svg", () => ({ default: "svg", Path: "path" }));
vi.mock("uniwind", () => ({ useCSSVariable: () => "#94a3b8" }));
vi.mock("expo-router", () => ({ useFocusEffect: () => {} }));
vi.mock("@/lib/create-button-box", () => ({ useCreateButtonCenter: () => fixture.button }));
vi.mock("@rn-primitives/portal", () => ({ Portal: fixture.portal }));

describe("screen-local create button pointer", () => {
  let root: Root;
  let container: HTMLDivElement;
  const screen = {} as View;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    fixture.x = 16;
    fixture.y = 200;
    fixture.width = 368;
    fixture.height = 180;
    fixture.button = { x: 344, y: 740, radius: 26 };
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  function render() {
    act(() =>
      root.render(
        createElement(CreateButtonPointer, {
          screenRef: { current: screen },
          children: createElement("div", { "data-card": true }),
        }),
      ),
    );
  }

  it("draws beside the card before focus, using screen layout rather than animated window coordinates", () => {
    render();
    expect(fixture.measureLayout).toHaveBeenCalledWith(screen, expect.any(Function));
    expect(fixture.measureInWindow).not.toHaveBeenCalled();
    expect(fixture.portal).not.toHaveBeenCalled();
    const card = container.querySelector("[data-card]")!;
    expect(card.parentElement?.querySelector("svg")).not.toBeNull();
    const overlay = container.querySelector<HTMLElement>('[data-pointer-events="none"]')!;
    expect(overlay.style.left).toBe("-16px");
    expect(overlay.style.top).toBe("-200px");
    const paths = container.querySelectorAll("path");
    expect(paths[0].getAttribute("d")).toMatch(/^M200,394 /);
    expect(paths[1].getAttribute("d")).toContain(" L344,700 L");
  });

  it("updates the screen-local geometry when the create button moves", () => {
    render();
    const initialPath = container.querySelector("path")!.getAttribute("d");
    fixture.button = { x: 56, y: 740, radius: 26 };
    render();
    expect(container.querySelector("path")!.getAttribute("d")).not.toBe(initialPath);
    expect(fixture.portal).not.toHaveBeenCalled();
  });

  it("keeps the card but omits the arrow when there is too little room", () => {
    fixture.y = 600;
    render();
    expect(container.querySelector("[data-card]")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
