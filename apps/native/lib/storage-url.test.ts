import { describe, expect, it } from "vitest";
import { getSupabaseStoragePath } from "./storage-url";

describe("Supabase storage URL parsing", () => {
  const projectUrl = "https://project.supabase.co";

  it("extracts an owned object path from the expected project and bucket", () => {
    expect(
      getSupabaseStoragePath(
        "https://project.supabase.co/storage/v1/object/public/items/user/item%20image.jpg?width=400",
        "items",
        projectUrl,
      ),
    ).toBe("user/item image.jpg");
  });

  it.each([
    "https://attacker.example/storage/v1/object/public/items/user/image.jpg",
    "https://project.supabase.co/storage/v1/object/public/avatars/user/image.jpg",
    "https://project.supabase.co/not-storage/items/user/image.jpg",
    "not a URL",
  ])("rejects an unowned URL: %s", (url) => {
    expect(getSupabaseStoragePath(url, "items", projectUrl)).toBeNull();
  });
});
