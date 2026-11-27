import { beforeEach, describe, expect, it, vi } from "vitest";
import { createItem } from "./items";
import { createWishlist } from "./wishlists";
import { deleteSecretSantaEvent } from "./secret-santa";

const { from, rpc, getUser } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@wishlist/backend/supabase/native", () => ({
  supabase: { from, rpc, auth: { getUser } },
}));
vi.mock("@/lib/create-notification", () => ({ notifyNewWishlist: vi.fn() }));
vi.mock("@/lib/wishlists", () => ({ normalizeSearchQuery: vi.fn(), parseEventDate: vi.fn() }));
vi.mock("@/lib/storage", () => ({ removeOwnedStorageImage: vi.fn() }));
vi.mock("expo-file-system", () => ({ File: class {} }));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
});
function existingRow(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  from.mockReturnValue(chain);
  return chain;
}

describe("offline create replay", () => {
  it("recognises an item already created before a lost response without inserting twice", async () => {
    const record = { id: "stable-item", wishlist_id: "parent", name: "Gift" };
    const chain = existingRow(record);
    await expect(
      createItem({ wishlist_id: "parent", name: "Gift" }, "stable-item"),
    ).resolves.toEqual(record);
    expect(chain.eq).toHaveBeenCalledWith("id", "stable-item");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("recognises a wishlist already created before a lost response", async () => {
    const chain = existingRow({ id: "stable-list", title: "Birthday" });
    await expect(
      createWishlist(
        {
          title: "Birthday",
          description: "",
          visibility: 2,
          accent: 0,
          imageUrl: "",
          eventDate: "",
        },
        "stable-list",
      ),
    ).resolves.toMatchObject({ id: "stable-list" });
    expect(chain.eq).toHaveBeenCalledWith("id", "stable-list");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("treats an already deleted event as synced but never swallows a failed read", async () => {
    existingRow(null);
    await deleteSecretSantaEvent("gone");
    expect(rpc).not.toHaveBeenCalled();
    existingRow(null, new Error("Network unavailable"));
    await expect(deleteSecretSantaEvent("gone")).rejects.toThrow("Network unavailable");
  });
});
