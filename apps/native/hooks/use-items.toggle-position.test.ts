import {
  MutationObserver,
  QueryClient,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { Item } from "@wishlist/backend/types/item";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toggleItemBought, toggleItemReservation } from "@/api/items";
import { useToggleItemBought, useToggleItemReservation } from "./use-items";

vi.mock("@/api/items", () => ({
  toggleItemBought: vi.fn(),
  toggleItemReservation: vi.fn(),
}));
vi.mock("@/hooks/use-infinite-page", () => ({}));
vi.mock("@/lib/card-motion", () => ({}));
vi.mock("@/lib/items", () => ({}));
vi.mock("@/providers/auth-provider", () => ({}));
vi.mock("@/lib/haptics", () => ({ hapticError: vi.fn(), hapticSuccess: vi.fn() }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

const LIST_KEY = ["items", "wishlist", "user", "wishlist-1", {}];

function item(id: string, status = 0) {
  return { id, status, reserved_by: null, wishlist_id: "wishlist-1", price: 10 } as unknown as Item;
}

describe.each([
  ["reservation", useToggleItemReservation, toggleItemReservation, 1],
  ["purchase", useToggleItemBought, toggleItemBought, 2],
] as const)("%s keeps the card in place", (_name, useAction, api, status) => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.mocked(useQueryClient).mockReturnValue(client);
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
    useAction();
    const options = vi.mocked(useMutation).mock.calls.at(-1)![0] as UseMutationOptions<
      Item,
      Error,
      string
    >;
    await new MutationObserver(client, options).mutate("second");
  }

  it("updates the item without moving it", async () => {
    await toggleSecond();

    const pages = client.getQueryData<InfiniteData<Item[], number>>(LIST_KEY)!.pages;
    expect(pages[0]!.map((entry) => entry.id)).toEqual(["first", "second", "third"]);
    expect(pages[0]![1]).toMatchObject({ status, reserved_by: "me", price: 10 });
  });

  it("marks the list stale so it re-sorts the next time it loads", async () => {
    await toggleSecond();

    expect(client.getQueryState(LIST_KEY)!.isInvalidated).toBe(true);
    expect(client.getQueryState(LIST_KEY)!.fetchStatus).toBe("idle");
  });
});
