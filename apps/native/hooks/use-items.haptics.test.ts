import {
  MutationObserver,
  QueryClient,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { Item } from "@wishlist/backend/types/item";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toggleItemBought, toggleItemReservation } from "@/api/items";
import { hapticError, hapticSuccess } from "@/lib/haptics";
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

describe.each([
  ["reservation", useToggleItemReservation, toggleItemReservation],
  ["purchase", useToggleItemBought, toggleItemBought],
] as const)("%s outcome feedback", (_name, useAction, api) => {
  let client: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.mocked(useQueryClient).mockReturnValue(client);
  });
  afterEach(() => client.clear());

  function action() {
    useAction();
    const options = vi.mocked(useMutation).mock.calls.at(-1)![0] as UseMutationOptions<
      Item,
      Error,
      string
    >;
    return new MutationObserver(client, options);
  }

  it("waits for the server before playing success", async () => {
    let resolve!: (item: Item) => void;
    vi.mocked(api).mockReturnValue(
      new Promise<Item>((done) => {
        resolve = done;
      }),
    );
    const result = action().mutate("item");
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
    await expect(action().mutate("item")).rejects.toThrow("Request failed");
    expect(hapticError).toHaveBeenCalledTimes(1);
    expect(hapticSuccess).not.toHaveBeenCalled();
  });
});
