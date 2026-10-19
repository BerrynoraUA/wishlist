import { MutationObserver, QueryClient } from "@tanstack/react-query";
import type { Item } from "@wishlist/backend/types/item";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toggleItemBought, toggleItemReservation } from "@/api/items";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { queuedItemMutationKeys, registerQueuedItemMutations } from "./use-items";

vi.mock("@/api/items", () => ({
  toggleItemBought: vi.fn(),
  toggleItemReservation: vi.fn(),
}));
vi.mock("@/hooks/use-infinite-page", () => ({}));
vi.mock("@/lib/card-motion", () => ({}));
vi.mock("@/lib/items", () => ({
  optimisticallyToggleItemBought: (item: Item) => item,
  optimisticallyToggleItemReservation: (item: Item) => item,
}));
vi.mock("@/providers/auth-provider", () => ({}));
vi.mock("@/lib/haptics", () => ({ hapticError: vi.fn(), hapticSuccess: vi.fn() }));

describe.each([
  ["reservation", queuedItemMutationKeys.toggleReservation, toggleItemReservation],
  ["purchase", queuedItemMutationKeys.toggleBought, toggleItemBought],
] as const)("%s outcome feedback", (_name, mutationKey, api) => {
  let client: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient();
    registerQueuedItemMutations(client);
  });
  afterEach(() => client.clear());

  function action() {
    // Retries would only delay the rejection under test.
    return new MutationObserver<Item, Error, { itemId: string; userId: string }>(client, {
      mutationKey,
      retry: false,
    });
  }

  it("waits for the server before playing success", async () => {
    let resolve!: (item: Item) => void;
    vi.mocked(api).mockReturnValue(
      new Promise<Item>((done) => {
        resolve = done;
      }),
    );
    const result = action().mutate({ itemId: "item", userId: "user" });
    await vi.waitFor(() => expect(api).toHaveBeenCalledWith("item"));
    expect(hapticSuccess).not.toHaveBeenCalled();
    expect(hapticError).not.toHaveBeenCalled();
    resolve({ id: "item", wishlist_id: "wishlist" } as Item);
    await result;
    expect(hapticSuccess).toHaveBeenCalledTimes(1);
    expect(hapticError).not.toHaveBeenCalled();
  });

  it("plays error without success when the server rejects", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Request failed"));
    await expect(action().mutate({ itemId: "item", userId: "user" })).rejects.toThrow(
      "Request failed",
    );
    expect(hapticError).toHaveBeenCalledTimes(1);
    expect(hapticSuccess).not.toHaveBeenCalled();
  });
});
