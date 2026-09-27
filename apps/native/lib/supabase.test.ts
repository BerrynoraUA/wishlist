import { afterEach, expect, it, vi } from "vitest";

vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "after-first-unlock",
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("reads the session while a user verification request is still pending", async () => {
  // Avoid creating the module's default network client; exercise the real factory below.
  vi.stubEnv("EXPO_PUBLIC_SHOWCASE", "1");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://native-auth-test.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  const session = {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "test-user" },
  };
  const storage = await import("expo-secure-store");
  vi.mocked(storage.getItemAsync).mockImplementation(async (key) =>
    key === "sb-native-auth-test-auth-token" ? JSON.stringify(session) : null,
  );

  let releaseRequest!: () => void;
  let requestStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      requestStarted();
      await pending;
      return new Response(JSON.stringify(session.user), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );

  const { createNativeClient } = await import("@wishlist/backend/supabase/native");
  const client = createNativeClient();
  await client.auth.getSession();
  const userRequest = client.auth.getUser();
  await started;
  const sessionRequest = client.auth.getSession();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      sessionRequest,
      new Promise<"blocked">((resolve) => {
        timer = setTimeout(() => resolve("blocked"), 100);
      }),
    ]);
    expect(result).toMatchObject({ data: { session }, error: null });
  } finally {
    clearTimeout(timer);
    releaseRequest();
    await Promise.all([userRequest, sessionRequest]);
    await client.auth.stopAutoRefresh();
  }
});
