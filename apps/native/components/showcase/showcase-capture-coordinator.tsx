import { useAppReady } from "@/components/splash/animated-splash";
import {
  markShowcaseSceneReady,
  readRequestedShowcaseScene,
  requestShowcaseOverlay,
  SHOWCASE_ENABLED,
} from "@/lib/showcase/showcase-control";
import { retryShowcaseOperation } from "@/lib/showcase/showcase-retry";
import { useAuth } from "@/providers/auth-provider";
import {
  showcaseSceneMatchesPathname,
  showcaseSceneOverlay,
  showcaseSceneRoute,
  type ShowcaseScene,
} from "@wishlist/backend/supabase/showcase/constants";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import * as React from "react";
import { Keyboard, View } from "react-native";

const SCENE_POLL_INTERVAL_MS = 250;
const SETTLE_DELAY_MS = 600;

/**
 * Drives app-store capture without adding any screenshot-only UI: it navigates the
 * production routes to the scene the runner asked for and reports readiness once that
 * route has stopped fetching. The account it photographs comes from the showcase
 * Supabase stand-in, so it is signed in from the first frame. Renders nothing outside
 * showcase builds.
 */
export function ShowcaseCaptureCoordinator() {
  if (!SHOWCASE_ENABLED) return null;

  return <ActiveShowcaseCaptureCoordinator />;
}

function ActiveShowcaseCaptureCoordinator() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const appReady = useAppReady();
  const fetchingCount = useIsFetching();
  const [requestedScene, setRequestedScene] = React.useState<ShowcaseScene | null>(null);
  const [readyScene, setReadyScene] = React.useState<ShowcaseScene | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const scene = await readRequestedShowcaseScene().catch(() => null);
      if (!cancelled && scene) setRequestedScene(scene);
    };

    void poll();
    const interval = setInterval(() => void poll(), SCENE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const onRequestedRoute = requestedScene
    ? showcaseSceneMatchesPathname(requestedScene, pathname)
    : false;

  React.useEffect(() => {
    if (!session || !requestedScene || onRequestedRoute) return;
    router.replace(showcaseSceneRoute(requestedScene) as never);
  }, [onRequestedRoute, requestedScene, router, session]);

  const overlay = requestedScene ? showcaseSceneOverlay(requestedScene) : null;

  // Opened only once the route underneath is in place, and withdrawn as soon as the
  // runner moves on, so a sheet never lingers into the next scene's capture.
  React.useEffect(() => {
    requestShowcaseOverlay(onRequestedRoute ? overlay : null);
  }, [onRequestedRoute, overlay]);

  const settled = Boolean(session) && appReady && onRequestedRoute && fetchingCount === 0;

  React.useEffect(() => {
    if (!requestedScene || !settled) {
      setReadyScene(null);
      return;
    }
    // Nothing in a capture should show a keyboard, and Android restores one when a
    // search field on a previous scene held focus.
    Keyboard.dismiss();

    let cancelled = false;
    let renderFrame: number | null = null;
    let readyFrame: number | null = null;
    const settleTimer = setTimeout(() => {
      renderFrame = requestAnimationFrame(() => {
        readyFrame = requestAnimationFrame(() => {
          void retryShowcaseOperation(() => markShowcaseSceneReady(requestedScene), {
            isCancelled: () => cancelled,
          });
          if (!cancelled) setReadyScene(requestedScene);
        });
      });
    }, SETTLE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      if (renderFrame !== null) cancelAnimationFrame(renderFrame);
      if (readyFrame !== null) cancelAnimationFrame(readyFrame);
    };
  }, [requestedScene, settled]);

  if (!readyScene) return null;

  // Kept for on-device debugging of a stuck capture; invisible in the screenshot.
  return (
    <View
      pointerEvents="none"
      testID={`showcase-ready-${readyScene}`}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0.01 }}
    />
  );
}
