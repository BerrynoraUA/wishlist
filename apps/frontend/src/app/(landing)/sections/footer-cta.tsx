"use client";

import Link from "next/link";
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
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>
              {t("Legal", { $id: "landing.footer.col.legal" })}
            </h4>
            <Link href="/pricing" className={styles.footerLink}>
              {t("Pricing", { $id: "landing.footer.link.pricing" })}
            </Link>
            <Link href="/terms-of-service" className={styles.footerLink}>
              {t("Terms of Service", { $id: "landing.footer.link.terms" })}
            </Link>
            <Link href="/privacy-policy" className={styles.footerLink}>
              {t("Privacy Policy", { $id: "landing.footer.link.privacy" })}
            </Link>
            <Link href="/refund-policy" className={styles.footerLink}>
              {t("Refund Policy", { $id: "landing.footer.link.refund" })}
            </Link>
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
