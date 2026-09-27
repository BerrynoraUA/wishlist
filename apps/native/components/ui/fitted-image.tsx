import { StyledImage, type StyledImageProps } from "@/components/ui/styled-image";
import { cn } from "@/lib/utils";
import type { ImageLoadEventData } from "expo-image";
import * as React from "react";
import { View } from "react-native";

/**
 * How tall or wide a frame sized to its photo may get, as width / height. Photos outside the
 * range are clamped to it (and then letterboxed by `FittedImage` if still too far off).
 * Cards stay close to square so a masonry grid doesn't turn into towers and slivers; single
 * images — a detail hero, a picker preview — get more room.
 */
export const IMAGE_ASPECT_RANGE = {
  card: [3 / 4, 4 / 3],
  hero: [4 / 5, 16 / 9],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * How far the photo's shape may differ from its frame's before cropping it to fill would cut
 * away too much of it (~20% of the photo). Past this it is letterboxed instead.
 */
const CROP_TOLERANCE = 1.25;
const ASPECT_CACHE_LIMIT = 500;

/**
 * Natural aspect ratio per URL. Image sizes aren't stored with items, so this is what lets a
 * frame that has seen a photo once — a recycled list cell, the detail sheet after its card —
 * lay out at the right height on first paint instead of jumping when the photo loads.
 */
const aspectCache = new Map<string, number>();

function rememberAspect(uri: string, aspect: number) {
  if (aspectCache.size >= ASPECT_CACHE_LIMIT && !aspectCache.has(uri)) {
    const oldest = aspectCache.keys().next().value;
    if (oldest !== undefined) aspectCache.delete(oldest);
  }
  aspectCache.set(uri, aspect);
}

function aspectFromLoad(event: ImageLoadEventData) {
  const { width, height } = event.source;
  return width > 0 && height > 0 ? width / height : null;
}

export function clampAspect(aspect: number, [min, max]: readonly [number, number]) {
  return Math.min(max, Math.max(min, aspect));
}

/**
 * The natural aspect ratio (width / height) of the photo at `uri` — `null` until it has
 * loaded somewhere in the app — plus the `onLoad` handler that reports it. Pass `onLoad` to
 * the image showing `uri`.
 */
export function useImageAspect(uri: string | null | undefined) {
  const cached = uri ? (aspectCache.get(uri) ?? null) : null;
  const [loaded, setLoaded] = React.useState<{ uri: string; aspect: number } | null>(null);

  const onLoad = React.useCallback(
    (event: ImageLoadEventData) => {
      const aspect = aspectFromLoad(event);
      if (!uri || aspect === null) return;
      rememberAspect(uri, aspect);
      setLoaded({ uri, aspect });
    },
    [uri],
  );

  return { aspect: loaded && loaded.uri === uri ? loaded.aspect : cached, onLoad };
}

/**
 * A photo that fills its frame without mangling it. Scraped product shots come in every shape
 * — tall phone renders, wide banners, square packshots — so cropping them all to fill cuts the
 * product off. Close-enough shapes fill the frame; anything else is shown whole, letterboxed
 * over a transparent background.
 * Frames sized to the photo (see `useImageAspect`) only letterbox what their range clamps.
 *
 * `className` sizes and positions the frame.
 */
export function FittedImage({
  uri,
  className,
  onLoad,
  ...props
}: Omit<StyledImageProps, "source" | "contentFit" | "className"> & {
  uri: string;
  className?: string;
}) {
  const [frameAspect, setFrameAspect] = React.useState<number | null>(null);
  const { aspect: imageAspect, onLoad: reportAspect } = useImageAspect(uri);

  const letterbox =
    frameAspect !== null &&
    imageAspect !== null &&
    Math.max(frameAspect / imageAspect, imageAspect / frameAspect) > CROP_TOLERANCE;

  return (
    <View
      className={cn("overflow-hidden", className)}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0) {
          setFrameAspect(layout.width / layout.height);
        }
      }}
    >
      <StyledImage
        {...props}
        source={{ uri }}
        contentFit={letterbox ? "contain" : "cover"}
        className="absolute inset-0 size-full"
        onLoad={(event) => {
          reportAspect(event);
          onLoad?.(event);
        }}
      />
    </View>
  );
}
