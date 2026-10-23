"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGT } from "gt-next";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { fade } from "@/components/marketing/motion";
import styles from "../landing.module.scss";

type SmoothScroll = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

export function Nav({ onSmoothScroll }: { onSmoothScroll: SmoothScroll }) {
  const t = useGT();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: t("Features", { $id: "landing.nav.features" }) },
    { href: "#how-it-works", label: t("How It Works", { $id: "landing.nav.howItWorks" }) },
    { href: "#discover", label: t("Discover", { $id: "landing.nav.discover" }) },
  ];

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    onSmoothScroll(event, href);
    setMenuOpen(false);
  };

  return (
    <nav className={styles.nav} data-scrolled={scrolled || menuOpen}>
      <div className={`${styles.container} ${styles.navInner}`}>
        <Link href="/" className={styles.logo}>
          <span aria-hidden="true">♡</span> {t("Wishlane", { $id: "landing.nav.brand" })}
        </Link>
        <div className={styles.navLinks}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.navLink}
              onClick={(event) => go(event, link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
            {t("Log In", { $id: "landing.nav.logIn" })}
          </Link>
          <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
            {t("Get Started Free", { $id: "landing.nav.getStartedFree" })}
          </Link>
        </div>
        <button
          type="button"
          className={styles.burger}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={
            menuOpen
              ? t("Close menu", { $id: "landing.nav.closeMenu.aria" })
              : t("Open menu", { $id: "landing.nav.openMenu.aria" })
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-mobile-menu"
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.mobileMenuLink}
                onClick={(event) => go(event, link.href)}
              >
                {link.label}
              </a>
            ))}
            <div className={styles.mobileMenuActions}>
              <Link href="/login" className={`${styles.btn} ${styles.btnOutline}`}>
                {t("Log In", { $id: "landing.mobile.logIn" })}
              </Link>
              <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                {t("Get Started Free", { $id: "landing.mobile.getStartedFree" })}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
