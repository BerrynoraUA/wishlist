import {
  isShowcaseScene,
  SHOWCASE_CONTROL_ORIGIN,
  type ShowcaseScene,
} from "@wishlist/backend/supabase/showcase/constants";

export const SHOWCASE_ENABLED = process.env.EXPO_PUBLIC_SHOWCASE === "1";

/**
 * Reads the scene the capture runner currently wants on screen. The runner's control
 * server replaces the custom native module t3code uses for the same purpose: it needs
 * no native code and reaches the iOS Simulator and the Android emulator identically
 * through `adb reverse` / the simulator's shared loopback.
 */
export async function readRequestedShowcaseScene(): Promise<ShowcaseScene | null> {
  const response = await fetch(`${SHOWCASE_CONTROL_ORIGIN}/scene`);
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  const scene = (payload as { scene?: unknown } | null)?.scene;
  return isShowcaseScene(scene) ? scene : null;
}

export async function markShowcaseSceneReady(scene: ShowcaseScene): Promise<boolean> {
  const response = await fetch(`${SHOWCASE_CONTROL_ORIGIN}/ready`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scene }),
  });
  return response.ok;
}
