import {
  isShowcaseScene,
  SHOWCASE_CONTROL_ORIGIN,
  type ShowcaseOverlay,
  type ShowcaseScene,
} from "@wishlist/backend/supabase/showcase/constants";

export const SHOWCASE_ENABLED = process.env.EXPO_PUBLIC_SHOWCASE === "1";

/**
 * Some scenes are a sheet over a route rather than a route. The capture coordinator
 * publishes the one it wants here and `CreateMenuHost` — which owns that sheet's state
 * in production — opens it, so the capture photographs the real sheet instead of a
 * screenshot-only copy of it.
 */
let requestedOverlay: ShowcaseOverlay | null = null;
const overlayListeners = new Set<() => void>();

export function requestShowcaseOverlay(overlay: ShowcaseOverlay | null): void {
  if (requestedOverlay === overlay) return;
  requestedOverlay = overlay;
  for (const listener of overlayListeners) listener();
}

export function subscribeToShowcaseOverlay(listener: () => void): () => void {
  overlayListeners.add(listener);
  return () => {
    overlayListeners.delete(listener);
  };
}

export function readShowcaseOverlay(): ShowcaseOverlay | null {
  return requestedOverlay;
}

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
