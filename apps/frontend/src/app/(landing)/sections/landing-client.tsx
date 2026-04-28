"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, RefObject } from "react";
import styles from "../landing.module.scss";
import { Cta } from "./cta";
import { Discover } from "./discover";
import { Features } from "./features";
import { FooterCta } from "./footer-cta";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { SocialProof } from "./social-proof";
import { Testimonials } from "./testimonials";

function useCounters(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let animated = false;
    const counters = element.querySelectorAll<HTMLElement>("[data-count]");
    if (!counters.length) return;

    function animateCounters() {
      counters.forEach((counter) => {
        const target = Number.parseInt(counter.dataset.count || "0", 10);
        const duration = 2000;
        const start = performance.now();

        function update(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - (1 - progress) ** 3;
          const current = Math.floor(eased * target);
          counter.textContent = current.toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(update);
            return;
          }
          counter.textContent = target.toLocaleString();
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

    const statsBar = element.querySelector(`.${styles.statsBar}`);
    if (statsBar) observer.observe(statsBar);

    return () => observer.disconnect();
  }, [containerRef]);
}

function useFadeAnimations(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const animated = element.querySelectorAll<HTMLElement>(`.${styles.animateIn}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Number.parseInt((entry.target as HTMLElement).dataset.delay || "0", 10);
          setTimeout(() => entry.target.classList.add(styles.visible), delay);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    animated.forEach((animatedElement) => observer.observe(animatedElement));
    return () => observer.disconnect();
  }, [containerRef]);
}

function useNavScroll(navRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!navRef.current) return;
    const navElement = navRef.current;

    function onScroll() {
      navElement.classList.toggle(styles.scrolled, window.scrollY > 20);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [navRef]);
}

export default function LandingClient() {
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
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith("#")) return;
      event.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
      closeMenu();
    },
    [closeMenu],
  );

  return (
    <div ref={pageRef} className={styles.landing}>
      <Hero
        burgerRef={burgerRef}
        mobileMenuRef={mobileMenuRef}
        navRef={navRef}
        onToggleMenu={toggleMenu}
        onSmoothScroll={smoothScroll}
      />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Discover />
      <Testimonials />
      <Cta />
      <FooterCta onSmoothScroll={smoothScroll} />
    </div>
  );
}
