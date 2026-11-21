import {
  MutationObserver,
  QueryClient,
  QueryObserver,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Item } from "@wishlist/backend/types/item";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toggleItemBought, toggleItemReservation } from "@/api/items";
import { queuedItemMutationKeys, registerQueuedItemMutations } from "./use-items";

vi.mock("@/api/items", () => ({
  toggleItemBought: vi.fn(),
  toggleItemReservation: vi.fn(),
}));
vi.mock("@/hooks/use-infinite-page", () => ({}));
vi.mock("@/lib/card-motion", () => ({}));
vi.mock("@/hooks/use-queued-write", () => ({}));
vi.mock("@/lib/record-id", () => ({}));
vi.mock("@/lib/items", () => ({
  optimisticallyToggleItemBought: (item: Item) => item,
  optimisticallyToggleItemReservation: (item: Item) => item,
}));
vi.mock("@/providers/auth-provider", () => ({}));
vi.mock("@/lib/haptics", () => ({ hapticError: vi.fn(), hapticSuccess: vi.fn() }));
const LIST_KEY = ["items", "wishlist", "user", "wishlist-1", {}];

function item(id: string, status = 0) {
  return { id, status, reserved_by: null, wishlist_id: "wishlist-1", price: 10 } as unknown as Item;
}

describe.each([
  ["reservation", queuedItemMutationKeys.toggleReservation, toggleItemReservation, 1],
  ["purchase", queuedItemMutationKeys.toggleBought, toggleItemBought, 2],
] as const)("%s keeps the card in place", (_name, mutationKey, api, status) => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    registerQueuedItemMutations(client);
    client.setQueryData<InfiniteData<Item[], number>>(LIST_KEY, {
      pageParams: [0],
      pages: [[item("first"), item("second"), item("third")]],
    });
  });
  afterEach(() => client.clear());

  async function toggleSecond() {
    // The RPC returns the price unformatted, so only the status fields may be merged.
    vi.mocked(api).mockResolvedValue({
      ...item("second", status),
      reserved_by: "me",
      price: "raw",
    } as unknown as Item);
    await new MutationObserver<Item, Error, { itemId: string; userId: string }>(client, {
      mutationKey,
      retry: false,
    }).mutate({ itemId: "second", userId: "me" });
  }

  it("updates the item without moving it", async () => {
    await toggleSecond();

    const pages = client.getQueryData<InfiniteData<Item[], number>>(LIST_KEY)!.pages;
    expect(pages[0]!.map((entry) => entry.id)).toEqual(["first", "second", "third"]);
    expect(pages[0]![1]).toMatchObject({ status, reserved_by: "me", price: 10 });
  });

  it("marks the list stale so it re-sorts the next time it loads", async () => {
    const serverOrder = {
      pageParams: [0],
      pages: [[item("first"), item("third"), item("second", status)]],
    };
    const list = new QueryObserver(client, {
      queryKey: LIST_KEY,
      queryFn: async () => serverOrder,
      staleTime: Infinity,
    });
    const unsubscribe = list.subscribe(() => {});
    try {
      await toggleSecond();

      expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
      expect(list.getCurrentResult().data?.pages[0]?.map((entry) => entry.id)).toEqual([
        "first",
        "second",
        "third",
      ]);
    } finally {
      unsubscribe();
    }
  });
});
