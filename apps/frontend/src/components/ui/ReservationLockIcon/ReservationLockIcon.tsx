"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import styles from "./ReservationLockIcon.module.scss";

type Props = {
  isReserved: boolean;
  size?: number;
  className?: string;
  animateOnReserve?: boolean;
};

const CLOSE_ANIMATION_MS = 420;

export function ReservationLockIcon({
  isReserved,
  size = 16,
  className,
  animateOnReserve = false,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const previousReservedRef = useRef(isReserved);

  useEffect(() => {
    if (animateOnReserve && !previousReservedRef.current && isReserved) {
      setIsClosing(true);
      const timeoutId = window.setTimeout(() => {
        setIsClosing(false);
      }, CLOSE_ANIMATION_MS);

      previousReservedRef.current = isReserved;
      return () => window.clearTimeout(timeoutId);
    }

    previousReservedRef.current = isReserved;
    return undefined;
  }, [animateOnReserve, isReserved]);

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-reserved={isReserved}
      data-closing={isClosing}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className={`${styles.layer} ${styles.open}`}>
        <LockOpen size={size} />
      </span>
      <span className={`${styles.layer} ${styles.closed}`}>
        <Lock size={size} />
      </span>
    </span>
  );
}
