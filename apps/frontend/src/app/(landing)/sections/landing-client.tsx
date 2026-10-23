"use client";

import { MotionConfig } from "framer-motion";
import { useCallback } from "react";
import type { MouseEvent } from "react";
import { displayFont } from "@/components/marketing/display-font";
import styles from "../landing.module.scss";
import { Cta } from "./cta";
import { Discover } from "./discover";
import { Features } from "./features";
import { FooterCta } from "./footer-cta";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Nav } from "./nav";

const NAV_OFFSET = 80;

export default function LandingClient() {
  const smoothScroll = useCallback((event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${styles.landing} ${displayFont.variable}`}>
        <Nav onSmoothScroll={smoothScroll} />
        <main>
          <Hero onSmoothScroll={smoothScroll} />
          <Features />
          <HowItWorks />
          <Discover />
          <Cta />
        </main>
        <FooterCta onSmoothScroll={smoothScroll} />
      </div>
    </MotionConfig>
  );
}
