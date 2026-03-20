"use client";

import { useEffect, useRef, useCallback } from "react";
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
      { threshold: 0.3 }
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
              10
            );
            setTimeout(() => entry.target.classList.add(styles.visible), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
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
    [closeMenu]
  );

  return (
    <div ref={pageRef} className={styles.landing}>
      {/* ====== NAVIGATION ====== */}
      <nav className={styles.nav} ref={navRef}>
        <div className={styles.navInner}>
          <a href="#" className={styles.navLogo}>
            <span className={styles.navLogoIcon}>♡</span> Wishlane
          </a>
          <div className={styles.navLinks}>
            <a
              href="#features"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#features")}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#how-it-works")}
            >
              How It Works
            </a>
            <a
              href="#discover"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#discover")}
            >
              Discover
            </a>
            <a
              href="#testimonials"
              className={styles.navLink}
              onClick={(e) => smoothScroll(e, "#testimonials")}
            >
              Testimonials
            </a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
              Log In
            </Link>
            <Link
              href="/login"
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              Get Started Free
            </Link>
          </div>
          <button
            className={styles.navBurger}
            ref={burgerRef}
            onClick={toggleMenu}
            aria-label="Open menu"
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
          Features
        </a>
        <a
          href="#how-it-works"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#how-it-works")}
        >
          How It Works
        </a>
        <a
          href="#discover"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#discover")}
        >
          Discover
        </a>
        <a
          href="#testimonials"
          className={styles.mobileMenuLink}
          onClick={(e) => smoothScroll(e, "#testimonials")}
        >
          Testimonials
        </a>
        <div className={styles.mobileMenuActions}>
          <Link
            href="/login"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}
          >
            Log In
          </Link>
          <Link
            href="/login"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
          >
            Get Started Free
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
            <span className={styles.heroBadge}>✨ Gifting, reimagined</span>
            <h1 className={styles.heroTitle}>
              Wishlists,
              <br />
              shared <em>beautifully</em>
            </h1>
            <p className={styles.heroSubtitle}>
              Create stunning wishlists, share them with friends and family, and
              never miss the perfect gift again. Wishlane makes every occasion
              unforgettable.
            </p>
            <div className={styles.heroCta}>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                Start Your First Wishlist
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
                See How It Works
              </a>
            </div>
            <p className={styles.heroNote}>
              Free forever · No credit card required
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
                      background:
                        "linear-gradient(135deg, #f472b6, #c0267e)",
                    }}
                  />
                  <div>
                    <h3 className={styles.mockupCardTitle}>
                      Birthday Wishes 🎂
                    </h3>
                    <span className={styles.mockupCardMeta}>
                      8 items · March 15
                    </span>
                  </div>
                  <span
                    className={`${styles.mockupCardBadge} ${styles.mockupCardBadgeFriends}`}
                  >
                    👥 Friends
                  </span>
                </div>
                <div className={styles.mockupCardItems}>
                  <MockupItem emoji="🎧" bg="#fde7f3" name="Wireless Headphones" price="$149.99" priority="high" />
                  <MockupItem emoji="📚" bg="#e0f2fe" name="Design Anthology Book" price="$34.00" priority="med" />
                  <MockupItem emoji="☕" bg="#fef3c7" name="Ceramic Pour-Over Set" price="$62.00" priority="low" />
                </div>
              </div>
              <div
                className={`${styles.mockupCardFloat} ${styles.mockupCardFloat1}`}
              >
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>❤️</span>
                  <span className={styles.mockupFloatText}>Item reserved!</span>
                </div>
              </div>
              <div
                className={`${styles.mockupCardFloat} ${styles.mockupCardFloat2}`}
              >
                <div className={styles.mockupFloatInner}>
                  <span className={styles.mockupFloatIcon}>🔗</span>
                  <span className={styles.mockupFloatText}>Link shared</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ====== STATS BAR ====== */}
      <section className={styles.statsBar}>
        <div className={`${styles.container} ${styles.statsBarInner}`}>
          <StatItem count={10000} suffix="+" label="Wishlists Created" />
          <StatItem count={50000} suffix="+" label="Gifts Tracked" delay={100} />
          <StatItem count={25000} suffix="+" label="Items Reserved" delay={200} />
          <StatItem count={98} suffix="%" label="Happy Gift-Givers" delay={300} />
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <SectionHeader
            badge="Features"
            title={<>Everything you need for <em>perfect</em> gifting</>}
            subtitle="From creating wishlists to discovering what your friends want — Wishlane handles every part of the gifting journey."
          />
          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              }
              iconBg="#fde7f3"
              iconColor="#c0267e"
              title="Beautiful Wishlists"
              desc="Create stunning wishlists with custom colors, descriptions, and event dates. Choose from five gorgeous accent colors to make each list unique."
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              }
              iconBg="#e0f2fe"
              iconColor="#2563eb"
              title="Smart Link Scraping"
              desc="Paste any product URL and Wishlane auto-fills the title, description, image, and price. Adding items has never been this effortless."
              delay={100}
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              iconBg="#f0fdf4"
              iconColor="#16a34a"
              title="Friends & Sharing"
              desc="Connect with friends via invite links or username search. Share wishlists publicly, with friends only, or keep them completely private."
              delay={200}
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              }
              iconBg="#fef3c7"
              iconColor="#d97706"
              title="Gift Reservations"
              desc="Reserve items on friends' wishlists so nobody buys the same gift. Only you can see your reservations — it stays a surprise!"
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              }
              iconBg="#ede9fe"
              iconColor="#7c3aed"
              title="Real-Time Notifications"
              desc="Get notified when friends add new wishlists, send friend requests, or when someone reserves an item. Stay in the loop effortlessly."
              delay={100}
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              }
              iconBg="#fce7f3"
              iconColor="#db2777"
              title="Discover & Explore"
              desc="Browse friends' public wishlists, see upcoming events with countdowns, and find the perfect gift from their curated selections."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <SectionHeader
            badge="How It Works"
            title={<>Three steps to <em>gifting joy</em></>}
            subtitle="Getting started with Wishlane is as easy as making a wish."
          />
          <div className={styles.steps}>
            {/* Step 1 */}
            <div className={`${styles.step} ${styles.animateIn}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Create Your Wishlist</h3>
                <p className={styles.stepDesc}>
                  Name it, pick a color, set an event date, and choose who can
                  see it. Add items by pasting links — we&apos;ll auto-fill the
                  details.
                </p>
              </div>
              <div className={styles.stepVisual}>
                <div
                  className={`${styles.stepDemo} ${styles.stepDemoCreate}`}
                >
                  <div className={styles.demoInput}>
                    <span className={styles.demoInputLabel}>
                      Wishlist Name
                    </span>
                    <span className={styles.demoInputValue}>
                      Christmas 2026 🎄
                    </span>
                  </div>
                  <DemoColors />
                  <DemoPrivacy />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`${styles.step} ${styles.animateIn}`}
              data-delay="150"
            >
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Share With Friends</h3>
                <p className={styles.stepDesc}>
                  Invite friends by sharing your unique link or searching their
                  username. They&apos;ll see your wishlists and you&apos;ll see
                  theirs.
                </p>
              </div>
              <div className={styles.stepVisual}>
                <div
                  className={`${styles.stepDemo} ${styles.stepDemoShare}`}
                >
                  <div className={styles.demoInvite}>
                    <span className={styles.demoInviteLabel}>
                      Your invite link
                    </span>
                    <div className={styles.demoInviteLink}>
                      <span>wishlane.net/invite/sarah_j</span>
                      <span className={styles.demoInviteCopy}>
                        📋 Copied!
                      </span>
                    </div>
                  </div>
                  <div className={styles.demoFriends}>
                    <DemoFriend
                      initial="A"
                      bg="#fde7f3"
                      color="#c0267e"
                      name="Alex Chen"
                      user="@alexc"
                    />
                    <DemoFriend
                      initial="M"
                      bg="#e0f2fe"
                      color="#2563eb"
                      name="Maya Patel"
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
                <h3 className={styles.stepTitle}>Reserve & Surprise</h3>
                <p className={styles.stepDesc}>
                  Browse friends&apos; wishlists and reserve items secretly. No
                  double-gifts, no ruined surprises — just perfect gifting every
                  time.
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
            badge="Discover"
            title={<>Find the <em>perfect gift</em>, every time</>}
            subtitle="Explore your friends' wishlists, see upcoming events, and never show up empty-handed."
          />
          <div className={`${styles.discoverShowcase} ${styles.animateIn}`}>
            <div className={styles.discoverEventBanner}>
              <div className={styles.discoverEventIcon}>🎉</div>
              <div className={styles.discoverEventText}>
                <strong>Alex&apos;s Birthday</strong> is in{" "}
                <span className={styles.discoverEventCountdown}>12 days</span>
              </div>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
              >
                View Wishlist
              </Link>
            </div>
            <div className={styles.discoverGrid}>
              <DiscoverCard
                gradient="linear-gradient(135deg, #fde7f3, #fce7f3)"
                emoji="👟"
                store="Nike.com"
                title="Air Jordan 1 Retro"
                price="$180.00"
                priority="high"
              />
              <DiscoverCard
                gradient="linear-gradient(135deg, #e0f2fe, #bfdbfe)"
                emoji="🎮"
                store="Amazon.com"
                title="PS5 DualSense Controller"
                price="$69.99"
                priority="med"
                delay={100}
              />
              <DiscoverCard
                gradient="linear-gradient(135deg, #fef3c7, #fde68a)"
                emoji="🕯️"
                store="Diptyque.com"
                title="Baies Scented Candle"
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
            badge="Testimonials"
            title={<>Loved by <em>gift-givers</em> everywhere</>}
          />
          <div className={styles.testimonialsGrid}>
            <Testimonial
              text="&ldquo;Wishlane completely changed how our family does holidays. No more awkward duplicate gifts — everyone knows exactly what to get!&rdquo;"
              name="Sarah Johnson"
              role="Mom of 3"
              initial="S"
              bg="#fde7f3"
              color="#c0267e"
            />
            <Testimonial
              text="&ldquo;The link scraping feature is magic. I just paste an Amazon link and boom — everything fills in automatically. So smooth.&rdquo;"
              name="Jake Rivera"
              role="Tech Enthusiast"
              initial="J"
              bg="#e0f2fe"
              color="#2563eb"
              delay={100}
            />
            <Testimonial
              text="&ldquo;I love the reservation system — I can claim a gift and nobody else sees it. Perfect surprises every single time.&rdquo;"
              name="Emma Nakamura"
              role="Gift Connoisseur"
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
              Ready to make gifting <em>magical</em>?
            </h2>
            <p className={styles.ctaSubtitle}>
              Join thousands of people who&apos;ve already simplified their
              gifting with Wishlane. It&apos;s free, it&apos;s beautiful, and it
              just works.
            </p>
            <div className={styles.ctaActions}>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnWhite} ${styles.btnLg}`}
              >
                Create Your First Wishlist
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
              Free forever · No credit card needed · Set up in 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <a href="#" className={styles.footerLogo}>
              <span className={styles.navLogoIcon}>♡</span> Wishlane
            </a>
            <p className={styles.footerTagline}>
              Wishlists, shared beautifully.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Product</h4>
              <a
                href="#features"
                className={styles.footerLink}
                onClick={(e) => smoothScroll(e, "#features")}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className={styles.footerLink}
                onClick={(e) => smoothScroll(e, "#how-it-works")}
              >
                How It Works
              </a>
              <a
                href="#discover"
                className={styles.footerLink}
                onClick={(e) => smoothScroll(e, "#discover")}
              >
                Discover
              </a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Company</h4>
              <a href="#" className={styles.footerLink}>About</a>
              <a href="#" className={styles.footerLink}>Blog</a>
              <a href="#" className={styles.footerLink}>Careers</a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Legal</h4>
              <a href="#" className={styles.footerLink}>Privacy</a>
              <a href="#" className={styles.footerLink}>Terms</a>
              <a href="#" className={styles.footerLink}>Cookies</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              &copy; 2026 Wishlane. All rights reserved.
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
  const priorityClass =
    priority === "high"
      ? styles.mockupItemPriorityHigh
      : priority === "med"
        ? styles.mockupItemPriorityMed
        : styles.mockupItemPriorityLow;
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
        {priority === "med" ? "Medium" : priority.charAt(0).toUpperCase() + priority.slice(1)}
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
      {subtitle && (
        <p className={styles.sectionHeaderSubtitle}>{subtitle}</p>
      )}
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

function DemoColors() {
  const colors = ["#f472b6", "#60a5fa", "#fdba74", "#6ee7b7", "#c4b5fd"];
  return (
    <div className={styles.demoColors}>
      {colors.map((c, i) => (
        <span
          key={c}
          className={`${styles.demoColor} ${i === 0 ? styles.demoColorActive : ""}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function DemoPrivacy() {
  return (
    <div className={styles.demoPrivacy}>
      <span
        className={`${styles.demoPrivacyOption} ${styles.demoPrivacyOptionActive}`}
      >
        🌍 Public
      </span>
      <span className={styles.demoPrivacyOption}>👥 Friends</span>
      <span className={styles.demoPrivacyOption}>🔒 Private</span>
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
      <div className={styles.demoFriendAvatar} style={{ background: bg, color }}>
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
  return (
    <div className={`${styles.stepDemo} ${styles.stepDemoReserve}`}>
      <DemoReserveItem
        emoji="🎧"
        bg="#fde7f3"
        name="Sony WH-1000XM5"
        price="$349.99"
        active
      />
      <DemoReserveItem
        emoji="📖"
        bg="#e0f2fe"
        name="Atomic Habits"
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
  const priorityClass =
    priority === "high"
      ? styles.discoverCardPriorityHigh
      : priority === "med"
        ? styles.discoverCardPriorityMed
        : styles.discoverCardPriorityLow;
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
            {priority === "high" ? "High" : priority === "med" ? "Medium" : "Low"}
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
