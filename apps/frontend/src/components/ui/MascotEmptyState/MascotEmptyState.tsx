"use client";

import Image from "next/image";
import { useRef } from "react";
import styles from "./MascotEmptyState.module.scss";

export type MascotVariant =
  | "sad-alone"
  | "gift-in-hands"
  | "empty-hands-shrug"
  | "magnifying-glass"
  | "explorer-map"
  | "sleeping-bell"
  | "lightbulb-idea"
  | "santa-sack"
  | "holding-key";

/** Variants with a closed-eye patch at /mascot/<variant>-blink.webp. */
const BLINKING: ReadonlySet<MascotVariant> = new Set(["gift-in-hands"]);

// A jelly wobble when the mascot is clicked.
const POKE_KEYFRAMES: Keyframe[] = [
  { scale: "1 1" },
  { scale: "1.14 0.86", offset: 0.14 },
  { scale: "0.92 1.08", offset: 0.38 },
  { scale: "1.05 0.95", offset: 0.6 },
  { scale: "0.98 1.02", offset: 0.8 },
  { scale: "1 1" },
];

export function MascotEmptyState({
  message,
  variant,
  compact = false,
  className,
}: {
  message: string;
  variant: MascotVariant;
  compact?: boolean;
  className?: string;
}) {
  const pokeRef = useRef<HTMLDivElement>(null);
  // The blink patch must line up pixel-exact with the artwork underneath; re-encoding
  // both as lossy images leaves a faint box around the eyes, so serve the originals.
  const blinks = BLINKING.has(variant);

  function handlePoke() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pokeRef.current?.animate(POKE_KEYFRAMES, { duration: 650, easing: "ease-out" });
  }

  return (
    <div className={`${styles.state} ${compact ? styles.compact : ""} ${className ?? ""}`}>
      <div className={styles.figure} data-variant={variant} aria-hidden="true" onClick={handlePoke}>
        <div ref={pokeRef} className={styles.poke}>
          <div className={styles.body}>
            {variant === "lightbulb-idea" ? <div className={styles.glow} /> : null}
            <div className={styles.breath}>
              <Image
                className={styles.image}
                src={`/mascot/${variant}.webp`}
                alt=""
                width={256}
                height={256}
                unoptimized={blinks}
              />
              {blinks ? (
                <Image
                  className={styles.blink}
                  src={`/mascot/${variant}-blink.webp`}
                  alt=""
                  width={256}
                  height={256}
                  unoptimized
                />
              ) : null}
            </div>
            {variant === "holding-key" ? (
              <>
                <Sparkle className={styles.sparkleA} />
                <Sparkle className={styles.sparkleB} />
              </>
            ) : null}
          </div>
          {variant === "sleeping-bell" ? (
            <div className={styles.zzzGroup}>
              {[0, 1, 2].map((index) => (
                <div key={index} className={styles.zzz}>
                  <span>z</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z"
        fill="#FFF6C8"
        stroke="#E8A800"
        strokeWidth={1}
      />
    </svg>
  );
}
