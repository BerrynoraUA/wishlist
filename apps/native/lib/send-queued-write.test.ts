import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendQueuedWrite } from "./send-queued-write";
import { createItem, updateItem } from "@/api/items";
import { createWishlist } from "@/api/wishlists";
import { createFriendGroup } from "@/api/friends";
import { createSecretSantaEvent } from "@/api/secret-santa";
import { scrapeProductLink } from "@/api/scrape-product";
import { uploadQueuedImage } from "./image-upload";
import type { QueuedWrite } from "./write-queue";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@wishlist/backend/supabase/native", () => ({ supabase: { auth: { getUser } } }));
vi.mock("@/api/items", () => ({ createItem: vi.fn(), updateItem: vi.fn(), deleteItem: vi.fn() }));
vi.mock("@/api/wishlists", () => ({
  createWishlist: vi.fn(),
  patchWishlist: vi.fn(),
  deleteWishlist: vi.fn(),
  grantWishlistAccess: vi.fn(),
  revokeWishlistAccess: vi.fn(),
}));
vi.mock("@/api/friends", () => ({
  createFriendGroup: vi.fn(),
  updateFriendGroup: vi.fn(),
  deleteFriendGroup: vi.fn(),
  grantWishlistGroupAccess: vi.fn(),
  revokeWishlistGroupAccess: vi.fn(),
}));
vi.mock("@/api/secret-santa", () => ({
  createSecretSantaEvent: vi.fn(),
  updateSecretSantaEvent: vi.fn(),
  deleteSecretSantaEvent: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ updateProfile: vi.fn(), updateSettings: vi.fn() }));
vi.mock("@/api/scrape-product", () => ({ scrapeProductLink: vi.fn() }));
vi.mock("./image-upload", () => ({ uploadQueuedImage: vi.fn() }));
vi.mock("expo-file-system", () => ({
  File: class {
    name = "stable-photo.jpg";
    type = "image/jpeg";
  },
}));

const product = {
  title: "Product",
  description: "Details",
  image: "https://shop.test/photo.jpg",
  price: "25",
  currency: "EUR",
  discount_price: null,
  has_discount: false,
  discount_end_date: null,
};
function write(overrides: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: "stable-id",
    userId: "me",
    entity: "item",
    action: "create",
    payload: {
      wishlist_id: "parent",
      name: "https://shop.test/product",
      url: "https://shop.test/product",
      fillFromLink: true,
    },
    local: {},
    ...overrides,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "me" } }, error: null });
  vi.mocked(scrapeProductLink).mockResolvedValue(product);
  vi.mocked(uploadQueuedImage).mockResolvedValue("https://storage.test/photo.jpg");
});

describe("sending saved changes", () => {
  it("fills a saved link on reconnect, preserving fields the user filled offline", async () => {
    await sendQueuedWrite(write());
    expect(createItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Product",
        price: "25",
        currency: "EUR",
        description: "Details",
      }),
      "stable-id",
    );
    await sendQueuedWrite(
      write({
        payload: {
          wishlist_id: "parent",
          url: "https://shop.test/product",
          name: "My name",
          price: "12",
          currency: "GBP",
          fillFromLink: true,
        },
      }),
    );
    expect(createItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "My name", price: "12", currency: "GBP" }),
      "stable-id",
    );
  });

  it("saves a scratch wish without scraping its optional link", async () => {
    await sendQueuedWrite(
      write({
        payload: { wishlist_id: "parent", name: "Handmade gift", url: "https://shop.test/product" },
      }),
    );
    expect(scrapeProductLink).not.toHaveBeenCalled();
    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Handmade gift" }),
      "stable-id",
    );
  });

  it("retains the link for retry if enrichment fails", async () => {
    vi.mocked(scrapeProductLink).mockRejectedValueOnce(new Error("Shop unavailable"));
    const entry = write();
    await expect(sendQueuedWrite(entry)).rejects.toThrow("Shop unavailable");
    expect(createItem).not.toHaveBeenCalled();
    expect(entry.payload).toMatchObject({ fillFromLink: true, url: "https://shop.test/product" });
  });

  it("uses the same photo key on retry and uploads before saving the record", async () => {
    const entry = write({
      action: "update",
      payload: { name: "Gift", image_url: "file:///documents/offline-images/stable-photo.jpg" },
    });
    await sendQueuedWrite(entry);
    await sendQueuedWrite(entry);
    expect(uploadQueuedImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ key: "stable-photo" }),
      "item",
    );
    expect(updateItem).toHaveBeenCalledWith("stable-id", {
      name: "Gift",
      image_url: "https://storage.test/photo.jpg",
    });
    expect(vi.mocked(uploadQueuedImage).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(updateItem).mock.invocationCallOrder[0],
    );
    expect(entry.payload).toMatchObject({
      image_url: "file:///documents/offline-images/stable-photo.jpg",
    });
  });

  it("passes the stable record ID for each create API", async () => {
    for (const entity of ["wishlist", "group", "event"] as const)
      await sendQueuedWrite(write({ entity, payload: { name: "Created offline" } }));
    for (const api of [createWishlist, createFriendGroup, createSecretSantaEvent])
      expect(api).toHaveBeenCalledWith({ name: "Created offline" }, "stable-id");
  });

  it("never sends a previous account's saved write using the new account", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "someone-else" } }, error: null });
    await expect(sendQueuedWrite(write())).rejects.toThrow("Sign in to the account");
    expect(scrapeProductLink).not.toHaveBeenCalled();
    expect(createItem).not.toHaveBeenCalled();
  });
});
