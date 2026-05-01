"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { Smartphone, X, Sparkles } from "lucide-react";
import styles from "./MobileComingSoonBanner.module.scss";

const COOKIE_NAME = "mobile_banner_dismissed";

type Props = {
  initiallyDismissed?: boolean;
};

export function MobileComingSoonBanner({ initiallyDismissed = false }: Props) {
  const t = useGT();
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  if (dismissed) return null;

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
