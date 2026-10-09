// @vitest-environment jsdom
import { act, createElement, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StyledFlashList } from "./styled-flash-list";

const fixture = vi.hoisted(() => ({
  listProps: {} as {
    refreshControl?: ReactElement<{
      refreshing: boolean;
      onRefresh: () => void;
      tintColor?: string;
    }>;
    onScroll?: (event: unknown) => void;
    onEndReached?: () => void;
  },
  haptic: vi.fn(),
}));

vi.mock("@shopify/flash-list", () => ({
  FlashList: (props: typeof fixture.listProps) => {
    fixture.listProps = props;
    return null;
  },
}));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => children,
  RefreshControl: () => null,
  ActivityIndicator: () => null,
}));
vi.mock("uniwind", () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => "#ec4899",
}));
vi.mock("gt-react-native", () => ({ useGT: () => (text: string) => text }));
vi.mock("@/lib/haptics", () => ({ hapticImpact: fixture.haptic }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  fixture.haptic.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("list pull-to-refresh", () => {
  it("keeps refreshing until the request settles and ignores repeated pulls", async () => {
    let finish!: () => void;
    const request = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onRefresh = vi.fn(() => request);
    await act(async () =>
      root.render(createElement(StyledFlashList, { data: [], renderItem: () => null, onRefresh })),
    );

    await act(async () => {
      fixture.listProps.refreshControl!.props.onRefresh();
      fixture.listProps.refreshControl!.props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(fixture.haptic).toHaveBeenCalledTimes(1);
    expect(fixture.listProps.refreshControl!.props.refreshing).toBe(true);

    await act(async () => finish());
    expect(fixture.listProps.refreshControl!.props.refreshing).toBe(false);
    await act(async () => fixture.listProps.refreshControl!.props.onRefresh());
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("clears the indicator after a failed request and allows retry", async () => {
    const onRefresh = vi.fn().mockRejectedValue(new Error("Offline"));
    await act(async () =>
      root.render(createElement(StyledFlashList, { data: [], renderItem: () => null, onRefresh })),
    );
    await act(async () => fixture.listProps.refreshControl!.props.onRefresh());
    expect(fixture.listProps.refreshControl!.props.refreshing).toBe(false);
    await act(async () => fixture.listProps.refreshControl!.props.onRefresh());
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("preserves scroll and pagination callbacks", async () => {
    const onScroll = vi.fn();
    const onEndReached = vi.fn();
    await act(async () =>
      root.render(
        createElement(StyledFlashList, {
          data: [],
          renderItem: () => null,
          onRefresh: async () => {},
          onScroll,
          onEndReached,
        }),
      ),
    );
    const event = { nativeEvent: { contentOffset: { y: -40 } } };
    fixture.listProps.onScroll!(event);
    fixture.listProps.onEndReached!();
    expect(onScroll).toHaveBeenCalledWith(event);
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });
});
