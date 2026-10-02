import {
  QueryClient,
  QueryObserver,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWishlistById } from "@/api/wishlists";
import { wishlistKeys } from "@/lib/wishlist-query-keys";
import { useWishlistById } from "./use-wishlists";

vi.mock("@/api/wishlists", () => ({ getWishlistById: vi.fn() }));
vi.mock("@/hooks/use-infinite-page", () => ({}));
vi.mock("@/lib/wishlists", () => ({}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "viewer" } }),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

const wishlist: Wishlist = {
  id: "wishlist",
  user_id: "viewer",
  title: "Birthday",
  description: null,
  image_url: null,
  created_at: null,
  visibility_type: 0,
  accent_type: 3,
  event_date: null,
  items_count: 1,
  can_edit: true,
  is_owner: true,
  access_type: null,
  owner_nickname: null,
  is_pinned: false,
};

describe("useWishlistById cached header", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(useQueryClient).mockReturnValue(client);
  });

  afterEach(() => client.clear());

  function observeWishlist(id = wishlist.id) {
    useWishlistById(id);
    const options = vi.mocked(useQuery).mock.calls.at(-1)![0] as UseQueryOptions<Wishlist>;
    return new QueryObserver(client, options);
  }

  it("shows the known color immediately while fetching fresh details", async () => {
    client.setQueryData(wishlistKeys.my("viewer"), { pages: [[wishlist]], pageParams: [0] });
    let resolve!: (value: Wishlist) => void;
    vi.mocked(getWishlistById).mockReturnValue(new Promise((done) => (resolve = done)));
    const observer = observeWishlist();
    const unsubscribe = observer.subscribe(() => {});

    expect(observer.getCurrentResult()).toMatchObject({
      data: wishlist,
      isLoading: false,
      isFetching: true,
      isPlaceholderData: true,
    });
    expect(getWishlistById).toHaveBeenCalledWith(wishlist.id);
    const freshWishlist = { ...wishlist, accent_type: 1 };
    resolve(freshWishlist);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toEqual(freshWishlist));
    expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
    unsubscribe();
  });

  it("finds friends' wishlists on later pages", () => {
    client.setQueryData(wishlistKeys.friend("viewer", "friend", { search: "birthday" }), {
      pages: [[], [wishlist]],
      pageParams: [0, 1],
    });
    expect(observeWishlist().getCurrentResult().data).toEqual(wishlist);
  });

  it("does not use another account's cached wishlist", () => {
    client.setQueryData(wishlistKeys.my("other-viewer"), {
      pages: [[wishlist]],
      pageParams: [0],
    });
    expect(observeWishlist().getCurrentResult()).toMatchObject({
      data: undefined,
      isPending: true,
    });
  });

  it("keeps existing detail data ahead of list data", () => {
    client.setQueryData(wishlistKeys.my("viewer"), { pages: [[wishlist]], pageParams: [0] });
    const detail = { ...wishlist, accent_type: 2 };
    client.setQueryData(wishlistKeys.detail("viewer", wishlist.id), detail);
    expect(observeWishlist().getCurrentResult().data).toEqual(detail);
  });

  it("keeps the loading state for a wishlist absent from the list", () => {
    client.setQueryData(wishlistKeys.my("viewer"), { pages: [[wishlist]], pageParams: [0] });
    expect(observeWishlist("uncached").getCurrentResult()).toMatchObject({
      data: undefined,
      isPending: true,
    });
  });
});
