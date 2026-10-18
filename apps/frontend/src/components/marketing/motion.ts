import type { Transition } from "framer-motion";

/**
 * Motion values for the marketing pages, mirrored from the native app
 * (`apps/native/lib/motion.ts`) so a press or a toggle feels the same on both.
 */
export const pressSpring: Transition = { type: "spring", stiffness: 460, damping: 16, mass: 0.75 };

export const pillSpring: Transition = { type: "spring", stiffness: 500, damping: 24, mass: 1 };

export const tap = { scale: 0.95, opacity: 0.9 };

export const easeOut = [0.16, 1, 0.3, 1] as const;

export const fade: Transition = { duration: 0.15, ease: easeOut };
