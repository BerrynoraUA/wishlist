"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { TESTIMONIAL_FADE_MS, TESTIMONIAL_ROTATION_MS } from "../constants";
import { getLoginTestimonials } from "../helpers";

/**
 * Owns the login page state: redirect/email query params, rotating
 * testimonial index, and the cross-fade flag.
 */
export function useLoginPage() {
  const t = useGT();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => searchParams.get("redirect_to") || "/home",
    [searchParams],
  );
  const prefillEmail = useMemo(
    () => searchParams.get("email") || "",
    [searchParams],
  );
  const registerHref = useMemo(() => {
    const params = new URLSearchParams();
    const accountMode = searchParams.get("account_mode");
    if (redirectTo) params.set("redirect_to", redirectTo);
    if (accountMode) params.set("account_mode", accountMode);
    const query = params.toString();
    return query ? `/register?${query}` : "/register";
  }, [redirectTo, searchParams]);

  const testimonials = useMemo(() => getLoginTestimonials(t), [t]);

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setTestimonialIdx((i) => (i + 1) % testimonials.length);
        setFadeIn(true);
      }, TESTIMONIAL_FADE_MS);
    }, TESTIMONIAL_ROTATION_MS);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return {
    redirectTo,
    prefillEmail,
    registerHref,
    currentTestimonial: testimonials[testimonialIdx],
    fadeIn,
  };
}
