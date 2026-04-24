"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { TESTIMONIAL_FADE_MS, TESTIMONIAL_ROTATION_MS } from "../../login/constants";
import { getRegisterTestimonials } from "../helpers";

/**
 * Owns the register page state: redirect query param and rotating testimonial
 * cross-fade.
 */
export function useRegisterPage() {
  const t = useGT();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => searchParams.get("redirect_to") || "/home", [searchParams]);

  const testimonials = useMemo(() => getRegisterTestimonials(t), [t]);

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
    currentTestimonial: testimonials[testimonialIdx],
    fadeIn,
  };
}
