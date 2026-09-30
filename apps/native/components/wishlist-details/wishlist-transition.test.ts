// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WishlistDetailScreen from "../../app/(tabs)/wishlists/[id]";

const fixture = vi.hoisted(() => ({
  loading: false,
  filtersActive: false,
  itemsCount: 0,
}));

vi.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  Redirect: () => null,
  useRouter: () => ({}),
  useLocalSearchParams: () => ({ id: "wishlist" }),
}));
vi.mock("react-native", () => ({ View: "div", useWindowDimensions: () => ({ width: 400 }) }));
vi.mock("react-native-reanimated", () => ({ default: { View: "div" } }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
vi.mock("gt-react-native", () => ({ useGT: () => (text: string) => text }));
vi.mock("@/lib/layout", () => ({ useTabBarContentPadding: () => 0, chunkRows: () => [] }));
vi.mock("@/api/share", () => ({}));
vi.mock("@/hooks/use-user", () => ({ useCurrentUserId: () => ({ data: "viewer" }) }));
vi.mock("@/hooks/use-own-reservations", () => ({ useShowOwnReservations: () => false }));
vi.mock("@/hooks/use-pro-gate", () => ({ useProGate: () => ({}) }));
vi.mock("@/hooks/use-wishlists", () => ({
  useWishlistById: () => ({ data: { items_count: fixture.itemsCount } }),
}));
vi.mock("@/hooks/use-items", () => ({
  useInfiniteWishlistItems: () => ({ isLoading: fixture.loading }),
  useItemVotes: () => ({}),
  useToggleItemVote: () => ({}),
  useToggleItemReservation: () => ({}),
  useToggleItemBought: () => ({}),
}));
vi.mock("@/hooks/use-infinite-page", () => ({ useInfiniteListData: () => ({ items: [] }) }));
vi.mock("@/hooks/use-friends", () => ({
  useCheckFriendship: () => ({}),
  useProfilesByIds: () => ({}),
}));
vi.mock("@/components/user-guide/user-guide-provider", () => ({
  useUserGuideStepCompletion: () => () => {},
  useUserGuideTargetRegistration: () => ({}),
}));
vi.mock("@/components/ui/slide-out-filter-panel", () => ({ useSlideOutPanel: () => ({}) }));
vi.mock("@/components/ui/styled-flash-list", () => ({
  StyledFlashList: ({ ListFooterComponent }: { ListFooterComponent: ReactNode }) =>
    ListFooterComponent,
}));
vi.mock("@/components/shared/inline-state", () => ({
  InlineState: ({
    pointToCreateButton,
    pointerScreenRef,
  }: {
    pointToCreateButton: boolean;
    pointerScreenRef?: unknown;
  }) =>
    createElement("div", {
      "data-pointer": String(pointToCreateButton),
      "data-in-screen": String(Boolean(pointerScreenRef)),
    }),
}));
vi.mock("@/components/ui/text", () => ({ Text: "span" }));
vi.mock("@/components/ui/floating-back-button", () => ({ FloatingBackButton: () => null }));
vi.mock("@/components/ui/list-skeletons", () => ({
  CardGridSkeleton: () => null,
  DetailSkeleton: () => null,
}));
vi.mock("@/components/wishlist-details/wishlist-item-filter-bar", () => ({
  WishlistItemFilterBar: () => null,
  wishlistItemFilterBarHasActiveFilters: () => fixture.filtersActive,
}));
vi.mock("@/components/wishlist-details/wishlist-item-header", () => ({
  WishlistItemHeader: () => null,
}));
vi.mock("@/components/wishlist-details/wishlist-item-card", () => ({
  WishlistItemCard: () => null,
}));
vi.mock("@/components/wishlists/wishlist-grid-animations", () => ({
  wishlistCardFadeIn: undefined,
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-delete-sheet", () => ({
  WishlistItemDeleteSheet: () => null,
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-detail-sheet", () => ({
  WishlistItemDetailSheet: () => null,
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet", () => ({
  WishlistItemCreateEditSheet: () => null,
}));
vi.mock("@/components/wishlist-details/sheets/save-item-to-wishlists-sheet", () => ({
  SaveItemToWishlistsSheet: () => null,
}));
vi.mock("@/components/wishlists/sheets/wishlist-delete-sheet", () => ({
  WishlistDeleteSheet: () => null,
}));
vi.mock("@/components/wishlists/sheets/wishlist-create-edit-sheet", () => ({
  WishlistCreateEditSheet: () => null,
}));
vi.mock("@/components/wishlists/sheets/share-feedback-sheet", () => ({
  ShareFeedbackSheet: () => null,
}));
vi.mock("@/components/wishlists/sheets/wishlist-share-sheet", () => ({
  WishlistShareSheet: () => null,
}));
vi.mock("@/components/wishlists/sheets/wishlist-grant-access-sheet", () => ({
  WishlistGrantAccessSheet: () => null,
}));

describe("wishlist empty-state pointer during native transitions", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    fixture.loading = false;
    fixture.filtersActive = false;
    fixture.itemsCount = 0;
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  function render() {
    act(() => root.render(createElement(WishlistDetailScreen)));
  }

  function pointer() {
    return container.querySelector("[data-pointer]")?.getAttribute("data-pointer");
  }

  it("renders a cached empty wishlist's arrow inside its screen without waiting for a transition", () => {
    render();
    expect(pointer()).toBe("true");
    expect(container.querySelector("[data-in-screen]")?.getAttribute("data-in-screen")).toBe(
      "true",
    );
  });

  it("shows the arrow as soon as empty items finish loading", () => {
    fixture.loading = true;
    render();
    expect(pointer()).toBeUndefined();
    fixture.loading = false;
    render();
    expect(pointer()).toBe("true");
  });

  it("does not show a create pointer for filtered-out existing items", () => {
    fixture.filtersActive = true;
    fixture.itemsCount = 1;
    render();
    expect(pointer()).toBe("false");
  });
});
