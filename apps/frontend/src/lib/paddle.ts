"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | null> | null = null;
let onCheckoutCompleteCb: (() => void) | null = null;

export function setOnCheckoutComplete(cb: () => void): void {
  onCheckoutCompleteCb = cb;
}

export function initPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return Promise.resolve(paddleInstance);
  if (initPromise) return initPromise;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.warn(
      "[Paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set — Paddle checkout will be unavailable.",
    );
    return Promise.resolve(null);
  }

  initPromise = initializePaddle({
    environment:
      (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") ??
      "sandbox",
    token,
    eventCallback: (event) => {
      if (event.name === "checkout.completed") {
        onCheckoutCompleteCb?.();
      }
    },
  }).then((p) => {
    paddleInstance = p ?? null;
    return paddleInstance;
  });

  return initPromise;
}

export function getPaddle(): Paddle | null {
  return paddleInstance;
}

export function resetPaddle(): void {
  paddleInstance = null;
  initPromise = null;
}
