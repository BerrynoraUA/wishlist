"use client";

import { useEffect, useState } from "react";
import { useGT } from "gt-next";
import { Smartphone, X, Sparkles } from "lucide-react";
import styles from "./MobileComingSoonBanner.module.scss";

const COOKIE_NAME = "mobile_banner_dismissed";

function isDismissedFromCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_NAME}=`));
}

export function MobileComingSoonBanner() {
  const t = useGT();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isDismissedFromCookie());
    setReady(true);
  }, []);

  if (!ready || dismissed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.shimmer} />
      <div className={styles.content}>
        <span className={styles.iconWrap}>
          <Smartphone size={15} />
        </span>
        <span className={styles.text}>
          {t("Mobile App Coming Soon", {
            $id: "banner.mobileComingSoon",
          })}
        </span>
        <Sparkles size={13} className={styles.sparkle} />
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={() => {
          document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          setDismissed(true);
        }}
        aria-label={t("Dismiss", { $id: "banner.dismiss" })}
      >
        <X size={14} />
      </button>
    </div>
  );
}
