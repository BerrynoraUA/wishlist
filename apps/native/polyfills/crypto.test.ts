import { createHash, webcrypto } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-crypto", () => ({
  getRandomValues: vi.fn((array: Uint32Array) => webcrypto.getRandomValues(array)),
  digest: vi.fn((algorithm: string, data: BufferSource) =>
    webcrypto.subtle.digest(algorithm, data),
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

it("generates an S256 Supabase PKCE challenge without WebCrypto on Android", async () => {
  vi.stubGlobal("crypto", undefined);
  const warn = vi.spyOn(console, "warn");
  await import("./crypto");
  const { createClient } = await import("@supabase/supabase-js");
  const storage = new Map<string, string>();
  const client = createClient("https://pkce-test.supabase.co", "test-key", {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
    },
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { skipBrowserRedirect: true },
  });
  expect(error).toBeNull();
  const url = new URL(data.url!);
  expect(url.searchParams.get("code_challenge_method")).toBe("s256");
  const { digest, getRandomValues } = await import("expo-crypto");
  expect(getRandomValues).toHaveBeenCalled();
  const [algorithm, bytes] = vi.mocked(digest).mock.calls[0]!;
  expect(algorithm).toBe("SHA-256");
  expect(url.searchParams.get("code_challenge")).toBe(
    createHash("sha256")
      .update(new Uint8Array(bytes as ArrayBuffer))
      .digest("base64url"),
  );
  expect(warn).not.toHaveBeenCalled();
});

it("preserves existing WebCrypto", async () => {
  vi.stubGlobal("crypto", webcrypto);
  await import("./crypto");
  expect(globalThis.crypto).toBe(webcrypto);
  expect(globalThis.crypto.subtle).toBe(webcrypto.subtle);
});
