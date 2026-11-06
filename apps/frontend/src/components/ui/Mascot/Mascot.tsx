"use client";

import {
  type BakedMascot,
  bakeMascot,
  type LayerTransform,
  MASCOT_ENTRANCE_MS,
  MASCOT_FEET,
  type MascotLayer,
  type MascotVariant,
} from "@wishlist/mascot";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./Mascot.module.scss";

export type { MascotVariant };

function transformOf({ x, y, rotate, sx, sy }: LayerTransform) {
  return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${sx}, ${sy})`;
}

const keyframeCache = new Map<string, Keyframe[]>();

/** One layer's baked tables, as keyframes for the Animations API. */
function keyframesOf(baked: BakedMascot, variant: MascotVariant, id: string) {
  const key = `${variant}/${id}`;
  const cached = keyframeCache.get(key);
  if (cached) return cached;
  const { x, y, rotate, sx, sy, opacity } = baked.layers[id] ?? {};
  const frames = Array.from({ length: baked.frames + 1 }, (_, i): Keyframe => {
    const transform = transformOf({
      x: x?.[i] ?? 0,
      y: y?.[i] ?? 0,
      rotate: rotate?.[i] ?? 0,
      sx: sx?.[i] ?? 1,
      sy: sy?.[i] ?? 1,
      opacity: 1,
    });
    return opacity ? { transform, opacity: opacity[i] } : { transform };
  });
  keyframeCache.set(key, frames);
  return frames;
}

function restStyle(baked: BakedMascot, id: string): CSSProperties | undefined {
  const rest = baked.rest[id];
  return rest && { transform: transformOf(rest), opacity: rest.opacity };
}

function Layer({ layer, baked, src }: { layer: MascotLayer; baked: BakedMascot; src: string }) {
  const animated = Boolean(baked.layers[layer.id]);
  return (
    <div
      className={`${styles.layer} ${/halo$/i.test(layer.id) ? styles.halo : ""}`}
      data-mascot-layer={animated ? layer.id : undefined}
      style={{
        transformOrigin: `${layer.pivot[0]}px ${layer.pivot[1]}px`,
        ...restStyle(baked, layer.id),
      }}
    >
      {layer.box && layer.atlas ? (
        <span
          className={styles.sprite}
          style={{
            left: layer.box[0],
            top: layer.box[1],
            width: layer.box[2],
            height: layer.box[3],
            backgroundImage: `url(${src})`,
            backgroundSize: `${baked.layout.atlas[0]}px ${baked.layout.atlas[1]}px`,
            backgroundPosition: `${-layer.atlas[0]!}px ${-layer.atlas[1]!}px`,
          }}
        />
      ) : null}
      {layer.children?.map((child) => (
        <Layer key={child.id} layer={child} baked={baked} src={src} />
      ))}
    </div>
  );
}

/**
 * The mascot, alive. It's as big as its `--mascot-size` CSS variable says, a plain number of
 * pixels, so a stylesheet can size it per breakpoint.
 */
export function Mascot({
  variant,
  className,
  afterEntrance = false,
}: {
  variant: MascotVariant;
  className?: string;
  /** Holds the action back until a parent's entrance has landed, so the two don't blur. */
  afterEntrance?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const baked = bakeMascot(variant);
  const src = `/mascot/atlas/${variant}.webp`;
  // Stays hidden until its one image has arrived, so it fades in whole and starts acting then.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  useEffect(() => {
    const image = new window.Image();
    const done = () => setLoadedSrc(src);
    image.onload = done;
    image.onerror = done;
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !loaded) return;
    const animations = Array.from(element.querySelectorAll<HTMLElement>("[data-mascot-layer]")).map(
      (layer) =>
        layer.animate(keyframesOf(baked, variant, layer.dataset.mascotLayer!), {
          duration: baked.duration,
          iterations: Infinity,
          delay: afterEntrance ? MASCOT_ENTRANCE_MS : 0,
          fill: "backwards",
        }),
    );

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    function sync() {
      for (const animation of animations) {
        // Cancelled, it falls back to the inline style: the finished drawing.
        if (reduced.matches) animation.cancel();
        else if (visible) animation.play();
        else animation.pause();
      }
    }
    sync();
    reduced.addEventListener("change", sync);

    // Nothing runs unseen: the landing page has several of these far down the page.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      sync();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      for (const animation of animations) animation.cancel();
    };
  }, [afterEntrance, baked, loaded, variant]);

  const [scale, fitX, fitY] = baked.layout.fit;
  return (
    <div
      ref={ref}
      className={`${styles.mascot} ${className ?? ""}`}
      data-loaded={loaded || undefined}
      aria-hidden="true"
    >
      <div className={styles.stage}>
        <div
          className={styles.layer}
          style={{
            transform: `translate(${fitX}px, ${fitY}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className={styles.layer}
            data-mascot-layer="root"
            style={{
              transformOrigin: `${MASCOT_FEET[0]}px ${MASCOT_FEET[1]}px`,
              ...restStyle(baked, "root"),
            }}
          >
            {baked.layout.layers.map((layer) => (
              <Layer key={layer.id} layer={layer} baked={baked} src={src} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
