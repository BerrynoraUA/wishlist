"use client";

import { Mascot, type MascotVariant } from "@/components/ui/Mascot/Mascot";
import { useRef } from "react";
import styles from "./MascotEmptyState.module.scss";

export type { MascotVariant };

// A jelly wobble when the mascot is clicked.
const POKE_KEYFRAMES: Keyframe[] = [
  { scale: "1 1", easing: "ease-in-out" },
  { scale: "1.14 0.86", offset: 0.14, easing: "ease-in-out" },
  { scale: "0.92 1.08", offset: 0.38, easing: "ease-in-out" },
  { scale: "1.05 0.95", offset: 0.6, easing: "ease-in-out" },
  { scale: "0.98 1.02", offset: 0.8, easing: "ease-in-out" },
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

  function handlePoke() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pokeRef.current?.animate(POKE_KEYFRAMES, { duration: 650 });
  }

  return (
    <div className={`${styles.state} ${compact ? styles.compact : ""} ${className ?? ""}`}>
      <div className={styles.figure} aria-hidden="true" onClick={handlePoke}>
        <div ref={pokeRef} className={styles.poke}>
          <Mascot variant={variant} afterEntrance />
        </div>
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
