"use client";

import { useGT } from "gt-next";
import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import styles from "./landing.module.scss";

/* ─── Animated Counter Hook ─── */
function useCounters(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animated = false;
    const counters = el.querySelectorAll<HTMLElement>("[data-count]");
    if (!counters.length) return;

    function animateCounters() {
      counters.forEach((counter) => {
        const target = parseInt(counter.dataset.count || "0", 10);
        const duration = 2000;
        const start = performance.now();

        function update(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(eased * target);
          counter.textContent = current.toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            counter.textContent = target.toLocaleString();
          }
        }
        requestAnimationFrame(update);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animated) {
            animated = true;
            animateCounters();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );

    const statsBar = el.querySelector(`.${styles.statsBar}`);
    if (statsBar) observer.observe(statsBar);

    return () => observer.disconnect();
  }, [containerRef]);
}

/* ─── Fade-in Animation Hook ─── */
function useFadeAnimations(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const animated = el.querySelectorAll<HTMLElement>(`.${styles.animateIn}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(
              (entry.target as HTMLElement).dataset.delay || "0",
              10,
            );
            setTimeout(() => entry.target.classList.add(styles.visible), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    animated.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);
}

/* ─── Navbar Scroll Hook ─── */
function useNavScroll(navRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function onScroll() {
      nav!.classList.toggle(styles.scrolled, window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [navRef]);
}

export default function LandingPage() {
  const t = useGT();
  const pageRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuOpen = useRef(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useCounters(pageRef);
  useFadeAnimations(pageRef);
  useNavScroll(navRef);

  const toggleMenu = useCallback(() => {
    mobileMenuOpen.current = !mobileMenuOpen.current;
    burgerRef.current?.classList.toggle(styles.active);
    mobileMenuRef.current?.classList.toggle(styles.open);
  }, []);

  const closeMenu = useCallback(() => {
    mobileMenuOpen.current = false;
    burgerRef.current?.classList.remove(styles.active);
    mobileMenuRef.current?.classList.remove(styles.open);
  }, []);

  const smoothScroll = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith("#")) return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offsetTop =
          target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
      closeMenu();
    },
    [closeMenu],
  );

  return (
    <div ref={pageRef} className={styles.landing}>
      {/* ====== NAVIGATION ====== */}
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
              onClick={(e) => smoothScroll(e, "#features")}
            >
              {t("Features", { $id: "landing.nav.features" })}
            </a>
            <a
              href="#how-it-works"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#how-it-works")}
            >
              {t("How It Works", { $id: "landing.nav.howItWorks" })}
            </a>
            <a
              href="#discover"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#discover")}
            >
              {t("Discover", { $id: "landing.nav.discover" })}
            </a>
            <a
              href="#testimonials"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#testimonials")}
            >
              {t("Testimonials", { $id: "landing.nav.testimonials" })}
            </a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
              {t("Log In", { $id: "landing.nav.logIn" })}
            </Link>
            <Link
              href="/login"
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {t("Get Started Free", { $id: "landing.nav.getStartedFree" })}
            </Link>
          </div>
          <button
            className={`${styles.navBurger} iconTooltipTrigger`}
            ref={burgerRef}
            onClick={toggleMenu}
            aria-label={t("Open menu", { $id: "landing.nav.openMenu.aria" })}
            data-tooltip={t("Open menu", { $id: "landing.nav.openMenu.tooltip" })}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={styles.mobileMenu} ref={mobileMenuRef}>
        <a
          href="#features"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#features")}
        >
          {t("Features", { $id: "landing.mobile.features" })}
        </a>
        <a
          href="#how-it-works"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#how-it-works")}
        >
          {t("How It Works", { $id: "landing.mobile.howItWorks" })}
        </a>
        <a
          href="#discover"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#discover")}
        >
          {t("Discover", { $id: "landing.mobile.discover" })}
        </a>
        <a
          href="#testimonials"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#testimonials")}
        >
          {t("Testimonials", { $id: "landing.mobile.testimonials" })}
        </a>
        <div className={styles.mobileMenuActions}>
          <Link
            href="/login"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}
          >
            {t("Log In", { $id: "landing.mobile.logIn" })}
          </Link>
          <Link
            href="/login"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
          >
            {t("Get Started Free", { $id: "landing.mobile.getStartedFree" })}
          </Link>
        </div>
      </div>

      {/* ====== HERO ====== */}
      <header className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={`${styles.heroBlob} ${styles.heroBlob1}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob2}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob3}`} />
        </div>
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={`${styles.heroContent} ${styles.animateIn}`}>
            <span className={styles.heroBadge}>
              {t("✨ Gifting, reimagined", { $id: "landing.hero.badge" })}
            </span>
            <h1 className={styles.heroTitle}>
              {t("Wishlists,", { $id: "landing.hero.titleLine1" })}
              <br />
              {t("shared", { $id: "landing.hero.titleShared" })}{" "}
              <em>
                {t("beautifully", { $id: "landing.hero.titleEmphasis" })}
              </em>
            </h1>
            <p className={styles.heroSubtitle}>
              {t(
                "Create stunning wishlists, share them with friends and family, and never miss the perfect gift again. Wishlane makes every occasion unforgettable.",
                { $id: "landing.hero.subtitle" },
              )}
            </p>
            <div className={styles.heroCta}>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                {t("Start Your First Wishlist", {
                  $id: "landing.hero.ctaPrimary",
                })}
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
                onClick={(e) => smoothScroll(e, "#how-it-works")}
              >
                {t("See How It Works", { $id: "landing.hero.ctaSecondary" })}
              </a>
            </div>
            <p className={styles.heroNote}>
              {t("Free forever · No credit card required", {
                $id: "landing.hero.note",
              })}
            </p>
          </div>
          <div
            className={`${styles.heroVisual} ${styles.animateIn}`}
            data-delay="200"
          >
            <div className={styles.heroMockup}>
              <div className={styles.mockupCardMain}>
                <div className={styles.mockupCardHeader}>
                  <div
                    className={styles.mockupCardColor}
                    style={{
                      background: "linear-gradient(135deg, #f472b6, #c0267e)",
                    }}
                  />
                  <div>
                    <h3 className={styles.mockupCardTitle}>
                      {t("Birthday Wishes 🎂", {
                        $id: "landing.hero.mockup.title",
                      })}
                    </h3>
                    <span className={styles.mockupCardMeta}>
                      {t("{count} items · {date}", {
                        count: 8,
                        date: "March 15",
                        $id: "landing.hero.mockup.meta",
                      })}
                    </span>
                  </div>
                  <span
                    className={`${styles.mockupCardBadge} ${styles.mockupCardBadgeFriends}`}
                  >
                    {t("👥 Friends", { $id: "landing.hero.mockup.badgeFriends" })}
                  </span>
                </div>
                <div className={styles.mockupCardItems}>
                  <MockupItem
                    emoji="🎧"
                    bg="#fde7f3"
                    name={t("Wireless Headphones", {
                      $id: "landing.hero.mockup.item1.name",
                    })}
                    price="$149.99"
                    priority="high"
                  />
                  <MockupItem
                    emoji="📚"
                    bg="#e0f2fe"
                    name={t("Design Anthology Book", {
                      $id: "landing.hero.mockup.item2.name",
                    })}
                    price="$34.00"
                    priority="med"
                  />
                  <MockupItem
                    emoji="☕"
                    bg="#fef3c7"
                    name={t("Ceramic Pour-Over Set", {
                      $id: "landing.hero.mockup.item3.name",
                    })}
                    price="$62.00"
                    priority="low"
                  />
                </div>
              </div>
              <div
                className={`${styles.mockupCardFloat} ${styles.mockupCardFloat1}`}
              >
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>❤️</span>
                  <span className={styles.mockupFloatText}>
                    {t("Item reserved!", {
                      $id: "landing.hero.mockup.floatReserved",
                    })}
                  </span>
                </div>
              </div>
              <div
                className={`${styles.mockupCardFloat} ${styles.mockupCardFloat2}`}
              >
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>🔗</span>
                  <span className={styles.mockupFloatText}>
                    {t("Link shared", {
                      $id: "landing.hero.mockup.floatShared",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ====== STATS BAR ====== */}
      <section className={styles.statsBar}>
        <div className={`${styles.container} ${styles.statsBarInner}`}>
          <StatItem
            count={10000}
            suffix="+"
            label={t("Wishlists Created", {
              $id: "landing.stats.wishlistsCreated",
            })}
          />
          <StatItem
            count={50000}
            suffix="+"
            label={t("Gifts Tracked", { $id: "landing.stats.giftsTracked" })}
            delay={100}
          />
          <StatItem
            count={25000}
            suffix="+"
            label={t("Items Reserved", { $id: "landing.stats.itemsReserved" })}
            delay={200}
          />
          <StatItem
            count={98}
            suffix="%"
            label={t("Happy Gift-Givers", {
              $id: "landing.stats.happyGiftGivers",
            })}
            delay={300}
          />
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <SectionHeader
            badge={t("Features", { $id: "landing.features.badge" })}
            title={
              <>
                {t("Everything you need for", {
                  $id: "landing.features.titlePart1",
                })}{" "}
                <em>
                  {t("perfect", { $id: "landing.features.titleEmphasis" })}
                </em>{" "}
                {t("gifting", { $id: "landing.features.titlePart2" })}
              </>
            }
            subtitle={t(
              "From creating wishlists to discovering what your friends want — Wishlane handles every part of the gifting journey.",
              { $id: "landing.features.subtitle" },
            )}
          />
          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              }
              iconBg="#fde7f3"
              iconColor="#c0267e"
              title={t("Beautiful Wishlists", {
                $id: "landing.features.card1.title",
              })}
              desc={t(
                "Create stunning wishlists with custom colors, descriptions, and event dates. Choose from five gorgeous accent colors to make each list unique.",
                { $id: "landing.features.card1.desc" },
              )}
            />
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              }
              iconBg="#e0f2fe"
              iconColor="#2563eb"
              title={t("Smart Link Scraping", {
                $id: "landing.features.card2.title",
              })}
              desc={t(
                "Paste any product URL and Wishlane auto-fills the title, description, image, and price. Adding items has never been this effortless.",
                { $id: "landing.features.card2.desc" },
              )}
              delay={100}
            />
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              iconBg="#f0fdf4"
              iconColor="#16a34a"
              title={t("Friends & Sharing", {
                $id: "landing.features.card3.title",
              })}
              desc={t(
                "Connect with friends via invite links or username search. Share wishlists publicly, with friends only, or keep them completely private.",
                { $id: "landing.features.card3.desc" },
              )}
              delay={200}
            />
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              }
              iconBg="#fef3c7"
              iconColor="#d97706"
              title={t("Gift Reservations", {
                $id: "landing.features.card4.title",
              })}
              desc={t(
                "Reserve items on friends' wishlists so nobody buys the same gift. Only you can see your reservations — it stays a surprise!",
                { $id: "landing.features.card4.desc" },
              )}
            />
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              }
              iconBg="#ede9fe"
              iconColor="#7c3aed"
              title={t("Real-Time Notifications", {
                $id: "landing.features.card5.title",
              })}
              desc={t(
                "Get notified when friends add new wishlists, send friend requests, or when someone reserves an item. Stay in the loop effortlessly.",
                { $id: "landing.features.card5.desc" },
              )}
              delay={100}
            />
            <FeatureCard
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              }
              iconBg="#fce7f3"
              iconColor="#db2777"
              title={t("Discover & Explore", {
                $id: "landing.features.card6.title",
              })}
              desc={t(
                "Browse friends' public wishlists, see upcoming events with countdowns, and find the perfect gift from their curated selections.",
                { $id: "landing.features.card6.desc" },
              )}
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <SectionHeader
            badge={t("How It Works", { $id: "landing.how.badge" })}
            title={
              <>
                {t("Three steps to", { $id: "landing.how.titlePart1" })}{" "}
                <em>
                  {t("gifting joy", { $id: "landing.how.titleEmphasis" })}
                </em>
              </>
            }
            subtitle={t(
              "Getting started with Wishlane is as easy as making a wish.",
              { $id: "landing.how.subtitle" },
            )}
          />
          <div className={styles.steps}>
            {/* Step 1 */}
            <div className={`${styles.step} ${styles.animateIn}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {t("Create Your Wishlist", { $id: "landing.how.step1.title" })}
                </h3>
                <p className={styles.stepDesc}>
                  {t(
                    "Name it, pick a color, set an event date, and choose who can see it. Add items by pasting links — we'll auto-fill the details.",
                    { $id: "landing.how.step1.desc" },
                  )}
                </p>
              </div>
              <div className={styles.stepVisual}>
                <StepDemoCreate />
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`${styles.step} ${styles.animateIn}`}
              data-delay="150"
            >
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {t("Share With Friends", { $id: "landing.how.step2.title" })}
                </h3>
                <p className={styles.stepDesc}>
                  {t(
                    "Invite friends by sharing your unique link or searching their username. They'll see your wishlists and you'll see theirs.",
                    { $id: "landing.how.step2.desc" },
                  )}
                </p>
              </div>
              <div className={styles.stepVisual}>
                <div className={`${styles.stepDemo} ${styles.stepDemoShare}`}>
                  <div className={styles.demoInvite}>
                    <span className={styles.demoInviteLabel}>
                      {t("Your invite link", {
                        $id: "landing.how.step2.inviteLabel",
                      })}
                    </span>
                    <div className={styles.demoInviteLink}>
                      <span>wishlane.net/invite/sarah_j</span>
                      <span className={styles.demoInviteCopy}>
                        {t("📋 Copied!", {
                          $id: "landing.how.step2.copied",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.demoFriends}>
                    <DemoFriend
                      initial="A"
                      bg="#fde7f3"
                      color="#c0267e"
                      name={t("Alex Chen", {
                        $id: "landing.how.step2.friend1.name",
                      })}
                      user="@alexc"
                    />
                    <DemoFriend
                      initial="M"
                      bg="#e0f2fe"
                      color="#2563eb"
                      name={t("Maya Patel", {
                        $id: "landing.how.step2.friend2.name",
                      })}
                      user="@mayap"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`${styles.step} ${styles.animateIn}`}
              data-delay="300"
            >
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {t("Reserve & Surprise", { $id: "landing.how.step3.title" })}
                </h3>
                <p className={styles.stepDesc}>
                  {t(
                    "Browse friends' wishlists and reserve items secretly. No double-gifts, no ruined surprises — just perfect gifting every time.",
                    { $id: "landing.how.step3.desc" },
                  )}
                </p>
              </div>
              <div className={styles.stepVisual}>
                <DemoReserve />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== DISCOVER ====== */}
      <section className={styles.discover} id="discover">
        <div className={styles.container}>
          <SectionHeader
            badge={t("Discover", { $id: "landing.discover.badge" })}
            title={
              <>
                {t("Find the", { $id: "landing.discover.titlePart1" })}{" "}
                <em>
                  {t("perfect gift", { $id: "landing.discover.titleEmphasis" })}
                </em>
                {t(", every time", { $id: "landing.discover.titlePart2" })}
              </>
            }
            subtitle={t(
              "Explore your friends' wishlists, see upcoming events, and never show up empty-handed.",
              { $id: "landing.discover.subtitle" },
            )}
          />
          <div className={`${styles.discoverShowcase} ${styles.animateIn}`}>
            <div className={styles.discoverEventBanner}>
              <div className={styles.discoverEventIcon}>🎉</div>
              <div className={styles.discoverEventText}>
                <strong>
                  {t("Alex's Birthday", {
                    $id: "landing.discover.eventName",
                  })}
                </strong>{" "}
                {t("is in", { $id: "landing.discover.isIn" })}{" "}
                <span className={styles.discoverEventCountdown}>
                  {t("{count} days", {
                    count: 12,
                    $id: "landing.discover.countdown",
                  })}
                </span>
              </div>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
              >
                {t("View Wishlist", { $id: "landing.discover.viewWishlist" })}
              </Link>
            </div>
            <div className={styles.discoverGrid}>
              <DiscoverCard
                gradient="linear-gradient(135deg, #fde7f3, #fce7f3)"
                emoji="👟"
                store="Nike.com"
                title={t("Air Jordan 1 Retro", {
                  $id: "landing.discover.card1.title",
                })}
                price="$180.00"
                priority="high"
              />
              <DiscoverCard
                gradient="linear-gradient(135deg, #e0f2fe, #bfdbfe)"
                emoji="🎮"
                store="Amazon.com"
                title={t("PS5 DualSense Controller", {
                  $id: "landing.discover.card2.title",
                })}
                price="$69.99"
                priority="med"
                delay={100}
              />
              <DiscoverCard
                gradient="linear-gradient(135deg, #fef3c7, #fde68a)"
                emoji="🕯️"
                store="Diptyque.com"
                title={t("Baies Scented Candle", {
                  $id: "landing.discover.card3.title",
                })}
                price="$76.00"
                priority="low"
                delay={200}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className={styles.testimonials} id="testimonials">
        <div className={styles.container}>
          <SectionHeader
            badge={t("Testimonials", { $id: "landing.testimonials.badge" })}
            title={
              <>
                {t("Loved by", { $id: "landing.testimonials.titlePart1" })}{" "}
                <em>
                  {t("gift-givers", {
                    $id: "landing.testimonials.titleEmphasis",
                  })}
                </em>{" "}
                {t("everywhere", { $id: "landing.testimonials.titlePart2" })}
              </>
            }
          />
          <div className={styles.testimonialsGrid}>
            <Testimonial
              text={t(
                "“Wishlane completely changed how our family does holidays. No more awkward duplicate gifts — everyone knows exactly what to get!”",
                { $id: "landing.testimonials.quote1" },
              )}
              name={t("Sarah Johnson", {
                $id: "landing.testimonials.author1.name",
              })}
              role={t("Mom of 3", { $id: "landing.testimonials.author1.role" })}
              initial="S"
              bg="#fde7f3"
              color="#c0267e"
            />
            <Testimonial
              text={t(
                "“The link scraping feature is magic. I just paste an Amazon link and boom — everything fills in automatically. So smooth.”",
                { $id: "landing.testimonials.quote2" },
              )}
              name={t("Jake Rivera", {
                $id: "landing.testimonials.author2.name",
              })}
              role={t("Tech Enthusiast", {
                $id: "landing.testimonials.author2.role",
              })}
              initial="J"
              bg="#e0f2fe"
              color="#2563eb"
              delay={100}
            />
            <Testimonial
              text={t(
                "“I love the reservation system — I can claim a gift and nobody else sees it. Perfect surprises every single time.”",
                { $id: "landing.testimonials.quote3" },
              )}
              name={t("Emma Nakamura", {
                $id: "landing.testimonials.author3.name",
              })}
              role={t("Gift Connoisseur", {
                $id: "landing.testimonials.author3.role",
              })}
              initial="E"
              bg="#f0fdf4"
              color="#16a34a"
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={`${styles.ctaCard} ${styles.animateIn}`}>
            <div className={styles.ctaBg}>
              <div className={`${styles.ctaBlob} ${styles.ctaBlob1}`} />
              <div className={`${styles.ctaBlob} ${styles.ctaBlob2}`} />
            </div>
            <h2 className={styles.ctaTitle}>
              {t("Ready to make gifting", {
                $id: "landing.cta.titlePart1",
              })}{" "}
              <em>{t("magical", { $id: "landing.cta.titleEmphasis" })}</em>?
            </h2>
            <p className={styles.ctaSubtitle}>
              {t(
                "Join thousands of people who've already simplified their gifting with Wishlane. It's free, it's beautiful, and it just works.",
                { $id: "landing.cta.subtitle" },
              )}
            </p>
            <div className={styles.ctaActions}>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnWhite} ${styles.btnLg}`}
              >
                {t("Create Your First Wishlist", {
                  $id: "landing.cta.button",
                })}
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
            </div>
            <p className={styles.ctaNote}>
              {t(
                "Free forever · No credit card needed · Set up in 30 seconds",
                { $id: "landing.cta.note" },
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>
              <span className={styles.navLogoIcon}>♡</span>{" "}
              {t("Wishlane", { $id: "landing.footer.brand" })}
            </span>
            <p className={styles.footerTagline}>
              {t("Wishlists, shared beautifully.", {
                $id: "landing.footer.tagline",
              })}
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
                onClick={(e) => smoothScroll(e, "#features")}
              >
                {t("Features", { $id: "landing.footer.link.features" })}
              </a>
              <a
                href="#how-it-works"
                className={styles.footerLink}
                onClick={(e) => smoothScroll(e, "#how-it-works")}
              >
                {t("How It Works", {
                  $id: "landing.footer.link.howItWorks",
                })}
              </a>
              <a
                href="#discover"
                className={styles.footerLink}
                onClick={(e) => smoothScroll(e, "#discover")}
              >
                {t("Discover", { $id: "landing.footer.link.discover" })}
              </a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              {t("© {year} Wishlane. All rights reserved.", {
                year: 2026,
                $id: "landing.footer.copyright",
              })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function MockupItem({
  emoji,
  bg,
  name,
  price,
  priority,
}: {
  emoji: string;
  bg: string;
  name: string;
  price: string;
  priority: "high" | "med" | "low";
}) {
  const t = useGT();
  const priorityClass =
    priority === "high"
      ? styles.mockupItemPriorityHigh
      : priority === "med"
        ? styles.mockupItemPriorityMed
        : styles.mockupItemPriorityLow;
  const priorityLabel =
    priority === "high"
      ? t("High", { $id: "landing.mockup.priority.high" })
      : priority === "med"
        ? t("Medium", { $id: "landing.mockup.priority.medium" })
        : t("Low", { $id: "landing.mockup.priority.low" });
  return (
    <div className={styles.mockupItem}>
      <div className={styles.mockupItemImg} style={{ background: bg }}>
        {emoji}
      </div>
      <div className={styles.mockupItemInfo}>
        <span className={styles.mockupItemName}>{name}</span>
        <span className={styles.mockupItemPrice}>{price}</span>
      </div>
      <span className={`${styles.mockupItemPriority} ${priorityClass}`}>
        {priorityLabel}
      </span>
    </div>
  );
}

function StatItem({
  count,
  suffix,
  label,
  delay,
}: {
  count: number;
  suffix: string;
  label: string;
  delay?: number;
}) {
  return (
    <div className={`${styles.stat} ${styles.animateIn}`} data-delay={delay}>
      <span className={styles.statNumber} data-count={count}>
        0
      </span>
      <span className={styles.statSuffix}>{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className={`${styles.sectionHeader} ${styles.animateIn}`}>
      <span className={styles.sectionHeaderBadge}>{badge}</span>
      <h2 className={styles.sectionHeaderTitle}>{title}</h2>
      {subtitle && <p className={styles.sectionHeaderSubtitle}>{subtitle}</p>}
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <div
      className={`${styles.featureCard} ${styles.animateIn}`}
      data-delay={delay}
    >
      <div
        className={styles.featureCardIcon}
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <h3 className={styles.featureCardTitle}>{title}</h3>
      <p className={styles.featureCardDesc}>{desc}</p>
    </div>
  );
}

function StepDemoCreate() {
  const t = useGT();
  const colors = ["#f472b6", "#60a5fa", "#fdba74", "#6ee7b7", "#c4b5fd"];
  const [activeColor, setActiveColor] = useState(0);
  const [activePrivacy, setActivePrivacy] = useState(0);

  const privacyOptions = [
    t("🌍 Public", { $id: "landing.demo.privacy.public" }),
    t("👥 Friends", { $id: "landing.demo.privacy.friends" }),
    t("🔒 Private", { $id: "landing.demo.privacy.private" }),
  ];

  const color = colors[activeColor];

  return (
    <div className={`${styles.stepDemo} ${styles.stepDemoCreate}`}>
      <div className={styles.demoInput}>
        <span className={styles.demoInputLabel}>
          {t("Wishlist Name", { $id: "landing.how.step1.demoLabel" })}
        </span>
        <span
          className={styles.demoInputValue}
          style={{ borderColor: color }}
        >
          {t("Christmas 2026 🎄", { $id: "landing.how.step1.demoValue" })}
        </span>
      </div>
      <div className={styles.demoColors}>
        {colors.map((c, i) => (
          <span
            key={c}
            className={`${styles.demoColor} ${i === activeColor ? styles.demoColorActive : ""}`}
            style={{
              background: c,
              borderColor: i === activeColor ? c : "transparent",
            }}
            onClick={() => setActiveColor(i)}
          />
        ))}
      </div>
      <div className={styles.demoPrivacy}>
        {privacyOptions.map((label, i) => (
          <span
            key={i}
            className={`${styles.demoPrivacyOption} ${i === activePrivacy ? styles.demoPrivacyOptionActive : ""}`}
            style={
              i === activePrivacy
                ? { background: `${color}18`, borderColor: color, color }
                : undefined
            }
            onClick={() => setActivePrivacy(i)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DemoFriend({
  initial,
  bg,
  color,
  name,
  user,
}: {
  initial: string;
  bg: string;
  color: string;
  name: string;
  user: string;
}) {
  return (
    <div className={styles.demoFriend}>
      <div
        className={styles.demoFriendAvatar}
        style={{ background: bg, color }}
      >
        {initial}
      </div>
      <div>
        <span className={styles.demoFriendName}>{name}</span>
        <span className={styles.demoFriendUser}>{user}</span>
      </div>
    </div>
  );
}

function DemoReserve() {
  const t = useGT();
  return (
    <div className={`${styles.stepDemo} ${styles.stepDemoReserve}`}>
      <DemoReserveItem
        emoji="🎧"
        bg="#fde7f3"
        name={t("Sony WH-1000XM5", {
          $id: "landing.demo.reserve.item1.name",
        })}
        price="$349.99"
        active
      />
      <DemoReserveItem
        emoji="📖"
        bg="#e0f2fe"
        name={t("Atomic Habits", {
          $id: "landing.demo.reserve.item2.name",
        })}
        price="$18.99"
      />
    </div>
  );
}

function DemoReserveItem({
  emoji,
  bg,
  name,
  price,
  active,
}: {
  emoji: string;
  bg: string;
  name: string;
  price: string;
  active?: boolean;
}) {
  return (
    <div className={styles.demoReserveItem}>
      <div className={styles.demoReserveItemImg} style={{ background: bg }}>
        {emoji}
      </div>
      <div className={styles.demoReserveItemInfo}>
        <span className={styles.demoReserveItemName}>{name}</span>
        <span className={styles.demoReserveItemPrice}>{price}</span>
      </div>
      <button
        className={`${styles.demoReserveItemBtn} ${active ? styles.demoReserveItemBtnActive : ""}`}
      >
        {active ? "❤️" : "🤍"}
      </button>
    </div>
  );
}

function DiscoverCard({
  gradient,
  emoji,
  store,
  title,
  price,
  priority,
  delay,
}: {
  gradient: string;
  emoji: string;
  store: string;
  title: string;
  price: string;
  priority: "high" | "med" | "low";
  delay?: number;
}) {
  const t = useGT();
  const priorityClass =
    priority === "high"
      ? styles.discoverCardPriorityHigh
      : priority === "med"
        ? styles.discoverCardPriorityMed
        : styles.discoverCardPriorityLow;
  const priorityLabel =
    priority === "high"
      ? t("High", { $id: "landing.discover.priority.high" })
      : priority === "med"
        ? t("Medium", { $id: "landing.discover.priority.medium" })
        : t("Low", { $id: "landing.discover.priority.low" });
  return (
    <div
      className={`${styles.discoverCard} ${styles.animateIn}`}
      data-delay={delay}
    >
      <div className={styles.discoverCardImg} style={{ background: gradient }}>
        <span className={styles.discoverCardEmoji}>{emoji}</span>
      </div>
      <div className={styles.discoverCardBody}>
        <span className={styles.discoverCardStore}>{store}</span>
        <h4 className={styles.discoverCardTitle}>{title}</h4>
        <div className={styles.discoverCardFooter}>
          <span className={styles.discoverCardPrice}>{price}</span>
          <span className={`${styles.discoverCardPriority} ${priorityClass}`}>
            {priorityLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function Testimonial({
  text,
  name,
  role,
  initial,
  bg,
  color,
  delay,
}: {
  text: string;
  name: string;
  role: string;
  initial: string;
  bg: string;
  color: string;
  delay?: number;
}) {
  return (
    <div
      className={`${styles.testimonial} ${styles.animateIn}`}
      data-delay={delay}
    >
      <div className={styles.testimonialStars}>★★★★★</div>
      <p
        className={styles.testimonialText}
        dangerouslySetInnerHTML={{ __html: text }}
      />
      <div className={styles.testimonialAuthor}>
        <div
          className={styles.testimonialAvatar}
          style={{ background: bg, color }}
        >
          {initial}
        </div>
        <div>
          <span className={styles.testimonialName}>{name}</span>
          <span className={styles.testimonialRole}>{role}</span>
        </div>
      </div>
    </div>
  );
}
