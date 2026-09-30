// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WishlistDetailScreen from "../../app/(tabs)/wishlists/[id]";

const fixture = vi.hoisted(() => ({
  loading: false,
  filtersActive: false,
  itemsCount: 0,
  closedSheetRender: vi.fn(),
  editSheetRender: vi.fn(),
  onEditWishlist: undefined as (() => void) | undefined,
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
  useWishlistById: () => ({ data: { items_count: fixture.itemsCount, is_owner: true } }),
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
  StyledFlashList: ({
    ListHeaderComponent,
    ListFooterComponent,
  }: {
    ListHeaderComponent: ReactNode;
    ListFooterComponent: ReactNode;
  }) => createElement("div", null, ListHeaderComponent, ListFooterComponent),
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
  WishlistItemHeader: ({ onEdit }: { onEdit?: () => void }) => {
    fixture.onEditWishlist = onEdit;
    return null;
  },
}));
vi.mock("@/components/wishlist-details/wishlist-item-card", () => ({
  WishlistItemCard: () => null,
}));
vi.mock("@/components/wishlists/wishlist-grid-animations", () => ({
  wishlistCardFadeIn: undefined,
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-delete-sheet", () => ({
  WishlistItemDeleteSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-detail-sheet", () => ({
  WishlistItemDetailSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet", () => ({
  WishlistItemCreateEditSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlist-details/sheets/save-item-to-wishlists-sheet", () => ({
  SaveItemToWishlistsSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlists/sheets/wishlist-delete-sheet", () => ({
  WishlistDeleteSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlists/sheets/wishlist-create-edit-sheet", () => ({
  WishlistCreateEditSheet: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    fixture.editSheetRender(props);
    return null;
  },
}));
vi.mock("@/components/wishlists/sheets/share-feedback-sheet", () => ({
  ShareFeedbackSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlists/sheets/wishlist-share-sheet", () => ({
  WishlistShareSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));
vi.mock("@/components/wishlists/sheets/wishlist-grant-access-sheet", () => ({
  WishlistGrantAccessSheet: () => {
    fixture.closedSheetRender();
    return null;
  },
}));

describe("wishlist empty-state pointer during native transitions", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    fixture.loading = false;
    fixture.filtersActive = false;
    fixture.itemsCount = 0;
    vi.clearAllMocks();
    fixture.onEditWishlist = undefined;
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

  it("does not initialize closed action sheets while opening the page", () => {
    render();
    expect(fixture.closedSheetRender).not.toHaveBeenCalled();
    expect(fixture.editSheetRender).not.toHaveBeenCalled();
  });

  it("mounts only the requested sheet and supports reopening after dismissal", () => {
    render();
    act(() => fixture.onEditWishlist?.());
    expect(fixture.closedSheetRender).not.toHaveBeenCalled();
    expect(fixture.editSheetRender).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    const { onOpenChange } = fixture.editSheetRender.mock.lastCall![0];
    act(() => onOpenChange(false));
    fixture.editSheetRender.mockClear();
    act(() => fixture.onEditWishlist?.());
    expect(fixture.editSheetRender).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    expect(fixture.closedSheetRender).not.toHaveBeenCalled();
  });

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
