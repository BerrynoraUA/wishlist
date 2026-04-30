"use client";

import { useGT } from "gt-next";
import Link from "next/link";
import { Gift, Headphones, BookOpen, Coffee, Check, Link2 } from "lucide-react";
import type { MouseEvent, RefObject } from "react";
import styles from "../landing.module.scss";
import { MockupItem } from "./shared";

type SmoothScroll = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

export function Hero({
  burgerRef,
  mobileMenuRef,
  navRef,
  onToggleMenu,
  onSmoothScroll,
}: {
  burgerRef: RefObject<HTMLButtonElement | null>;
  mobileMenuRef: RefObject<HTMLDivElement | null>;
  navRef: RefObject<HTMLElement | null>;
  onToggleMenu: () => void;
  onSmoothScroll: SmoothScroll;
}) {
  const t = useGT();

  return (
    <>
      <nav className={styles.nav} ref={navRef}>
        <div className={styles.navInner}>
          <span className={styles.navLogo}>
            <span className={styles.navLogoIcon}>♡</span>{" "}
            {t("Wishlane", { $id: "landing.nav.brand" })}
          </span>
          <div className={styles.navLinks}>
            <a
              href="#features"
              className={styles.navLink}
              onClick={(event) => onSmoothScroll(event, "#features")}
            >
              {t("Features", { $id: "landing.nav.features" })}
            </a>
            <a
              href="#how-it-works"
              className={styles.navLink}
              onClick={(event) => onSmoothScroll(event, "#how-it-works")}
            >
              {t("How It Works", { $id: "landing.nav.howItWorks" })}
            </a>
            <a
              href="#discover"
              className={styles.navLink}
              onClick={(event) => onSmoothScroll(event, "#discover")}
            >
              {t("Discover", { $id: "landing.nav.discover" })}
            </a>
            <a
              href="#testimonials"
              className={styles.navLink}
              onClick={(event) => onSmoothScroll(event, "#testimonials")}
            >
              {t("Testimonials", { $id: "landing.nav.testimonials" })}
            </a>
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
            className={`${styles.navBurger} iconTooltipTrigger`}
            ref={burgerRef}
            onClick={onToggleMenu}
            aria-label={t("Open menu", { $id: "landing.nav.openMenu.aria" })}
            data-tooltip={t("Open menu", { $id: "landing.nav.openMenu.tooltip" })}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={styles.mobileMenu} ref={mobileMenuRef}>
        <a
          href="#features"
          className={styles.mobileMenuLink}
          onClick={(event) => onSmoothScroll(event, "#features")}
        >
          {t("Features", { $id: "landing.mobile.features" })}
        </a>
        <a
          href="#how-it-works"
          className={styles.mobileMenuLink}
          onClick={(event) => onSmoothScroll(event, "#how-it-works")}
        >
          {t("How It Works", { $id: "landing.mobile.howItWorks" })}
        </a>
        <a
          href="#discover"
          className={styles.mobileMenuLink}
          onClick={(event) => onSmoothScroll(event, "#discover")}
        >
          {t("Discover", { $id: "landing.mobile.discover" })}
        </a>
        <a
          href="#testimonials"
          className={styles.mobileMenuLink}
          onClick={(event) => onSmoothScroll(event, "#testimonials")}
        >
          {t("Testimonials", { $id: "landing.mobile.testimonials" })}
        </a>
        <div className={styles.mobileMenuActions}>
          <Link href="/login" className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}>
            {t("Log In", { $id: "landing.mobile.logIn" })}
          </Link>
          <Link href="/register" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            {t("Get Started Free", { $id: "landing.mobile.getStartedFree" })}
          </Link>
        </div>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={`${styles.heroBlob} ${styles.heroBlob1}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob2}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob3}`} />
        </div>
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={`${styles.heroContent} ${styles.animateIn}`}>
            <span className={styles.heroBadge}>
              {t("Gifting, reimagined", { $id: "landing.hero.badge" })}
            </span>
            <h1 className={styles.heroTitle}>
              {t("Wishlists,", { $id: "landing.hero.titleLine1" })}
              <br />
              {t("shared", { $id: "landing.hero.titleShared" })}{" "}
              <em>{t("beautifully", { $id: "landing.hero.titleEmphasis" })}</em>
            </h1>
            <p className={styles.heroSubtitle}>
              {t(
                "Create stunning wishlists, share them with friends and family, and never miss the perfect gift again. Wishlane makes every occasion unforgettable.",
                { $id: "landing.hero.subtitle" },
              )}
            </p>
            <div className={styles.heroCta}>
              <Link
                href="/register"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                {t("Start Your First Wishlist", { $id: "landing.hero.ctaPrimary" })}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className={`${styles.btn} ${styles.btnOutline} ${styles.btnLg}`}
                onClick={(event) => onSmoothScroll(event, "#how-it-works")}
              >
                {t("See How It Works", { $id: "landing.hero.ctaSecondary" })}
              </a>
            </div>
            <p className={styles.heroNote}>
              {t("Free forever - No credit card required", {
                $id: "landing.hero.note",
              })}
            </p>
          </div>
          <div className={`${styles.heroVisual} ${styles.animateIn}`} data-delay="200">
            <div className={styles.heroMockup}>
              <div className={styles.mockupCardMain}>
                <div className={styles.mockupCardHeader}>
                  <div
                    className={styles.mockupCardColor}
                    style={{ background: "linear-gradient(135deg, #f472b6, #c0267e)" }}
                  >
                    <Gift size={24} />
                  </div>
                  <div>
                    <h3 className={styles.mockupCardTitle}>
                      {t("Birthday Wishes", { $id: "landing.hero.mockup.title" })}
                    </h3>
                    <span className={styles.mockupCardMeta}>
                      {t("{count} items - {date}", {
                        count: 8,
                        date: "March 15",
                        $id: "landing.hero.mockup.meta",
                      })}
                    </span>
                  </div>
                  <span className={`${styles.mockupCardBadge} ${styles.mockupCardBadgeFriends}`}>
                    {t("Friends", { $id: "landing.hero.mockup.badgeFriends" })}
                  </span>
                </div>
                <div className={styles.mockupCardItems}>
                  <MockupItem
                    icon={<Headphones size={20} color="#c0267e" />}
                    bg="#fde7f3"
                    name={t("Wireless Headphones", { $id: "landing.hero.mockup.item1.name" })}
                    price="$149.99"
                    priority="high"
                  />
                  <MockupItem
                    icon={<BookOpen size={20} color="#0284c7" />}
                    bg="#e0f2fe"
                    name={t("Design Anthology Book", { $id: "landing.hero.mockup.item2.name" })}
                    price="$34.00"
                    priority="med"
                  />
                  <MockupItem
                    icon={<Coffee size={20} color="#b45309" />}
                    bg="#fef3c7"
                    name={t("Ceramic Pour-Over Set", { $id: "landing.hero.mockup.item3.name" })}
                    price="$62.00"
                    priority="low"
                  />
                </div>
              </div>
              <div className={`${styles.mockupCardFloat} ${styles.mockupCardFloat1}`}>
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>
                    <Check size={16} />
                  </span>
                  <span className={styles.mockupFloatText}>
                    {t("Item reserved!", { $id: "landing.hero.mockup.floatReserved" })}
                  </span>
                </div>
              </div>
              <div className={`${styles.mockupCardFloat} ${styles.mockupCardFloat2}`}>
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>
                    <Link2 size={16} />
                  </span>
                  <span className={styles.mockupFloatText}>
                    {t("Link shared", { $id: "landing.hero.mockup.floatShared" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
