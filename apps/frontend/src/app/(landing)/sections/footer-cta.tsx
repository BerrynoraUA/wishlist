"use client";

import { useGT } from "gt-next";
import type { MouseEvent } from "react";
import styles from "../landing.module.scss";

type SmoothScroll = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

export function FooterCta({ onSmoothScroll }: { onSmoothScroll: SmoothScroll }) {
  const t = useGT();

  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>
            <span className={styles.navLogoIcon}>♡</span>{" "}
            {t("Wishlane", { $id: "landing.footer.brand" })}
          </span>
          <p className={styles.footerTagline}>
            {t("Wishlists, shared beautifully.", { $id: "landing.footer.tagline" })}
          </p>
        </div>
        <div className={styles.footerLinks}>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>
              {t("Product", { $id: "landing.footer.col.product" })}
            </h4>
            <a
              href="#features"
              className={styles.footerLink}
              onClick={(event) => onSmoothScroll(event, "#features")}
            >
              {t("Features", { $id: "landing.footer.link.features" })}
            </a>
            <a
              href="#how-it-works"
              className={styles.footerLink}
              onClick={(event) => onSmoothScroll(event, "#how-it-works")}
            >
              {t("How It Works", { $id: "landing.footer.link.howItWorks" })}
            </a>
            <a
              href="#discover"
              className={styles.footerLink}
              onClick={(event) => onSmoothScroll(event, "#discover")}
            >
              {t("Discover", { $id: "landing.footer.link.discover" })}
            </a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p className={styles.footerCopy}>
            {t("Copyright {year} Wishlane. All rights reserved.", {
              year: 2026,
              $id: "landing.footer.copyright",
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
