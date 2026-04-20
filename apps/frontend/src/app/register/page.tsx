"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Gift } from "lucide-react";
import styles from "../login/login.module.scss";
import { AuthForm } from "../login/components/AuthForm";

function RegisterPageContent() {
  const t = useGT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => searchParams.get("redirect_to") || "/home", [searchParams]);

  const testimonials = useMemo(
    () => [
      {
        quote: t('"The link scraping feature is magic. Just paste a URL and everything fills in automatically!"', { $id: "register.testimonial.quote.1" }),
        name: t("Jake Rivera", { $id: "register.testimonial.name.1" }),
        role: t("Tech Enthusiast", { $id: "register.testimonial.role.1" }),
        initial: "J",
        bg: "#e0f2fe",
        color: "#2563eb",
      },
      {
        quote: t('"Setting up my first wishlist took less than a minute. So intuitive!"', { $id: "register.testimonial.quote.2" }),
        name: t("Olivia Kim", { $id: "register.testimonial.name.2" }),
        role: t("Design Student", { $id: "register.testimonial.role.2" }),
        initial: "O",
        bg: "#fde7f3",
        color: "#c0267e",
      },
      {
        quote: t('"Perfect for coordinating gifts with family across different countries."', { $id: "register.testimonial.quote.3" }),
        name: t("Daniel Müller", { $id: "register.testimonial.name.3" }),
        role: t("Frequent traveler", { $id: "register.testimonial.role.3" }),
        initial: "D",
        bg: "#f0fdf4",
        color: "#16a34a",
      },
    ],
    [t],
  );

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setTestimonialIdx((i) => (i + 1) % testimonials.length);
        setFadeIn(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const currentTestimonial = testimonials[testimonialIdx];

  return (
    <main className={styles.page}>
      {/* ─── Visual Panel ─── */}
      <div className={styles.visual}>
        <div className={`${styles.visualBlob} ${styles.visualBlob1}`} />
        <div className={`${styles.visualBlob} ${styles.visualBlob2}`} />
        <div className={`${styles.visualBlob} ${styles.visualBlob3}`} />

        <div className={styles.visualContent}>
          <span className={styles.visualLogo}>
            <span className={styles.visualLogoIcon}><Gift size={20} /></span>{" "}
            {t("Wishlane", { $id: "auth.visual.brand" })}
          </span>
          <h2 className={styles.visualTitle}>
            {t("Start your", { $id: "register.visual.titleLine1" })}
            <br />
            <em>{t("gifting journey", { $id: "register.visual.titleEmphasis" })}</em>
          </h2>
          <p className={styles.visualSubtitle}>
            {t("Create stunning wishlists, share them with friends and family, and never miss the perfect gift again.", {
              $id: "register.visual.subtitle",
            })}
          </p>

          <div className={styles.visualMockup}>
            <div className={styles.mockupCard}>
              <div className={styles.mockupCardHeader}>
                <div className={styles.mockupCardIcon}><Gift size={18} /></div>
                <div>
                  <div className={styles.mockupCardTitle}>
                    {t("Christmas 2026 🎄", { $id: "register.mockup.title" })}
                  </div>
                  <span className={styles.mockupCardMeta}>
                    {t("{count} items · {date}", { count: 5, date: "Dec 25", $id: "register.mockup.meta" })}
                  </span>
                </div>
              </div>
              <div className={styles.mockupCardItems}>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#fde7f3" }}>🎁</div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>{t("Cozy Wool Sweater", { $id: "register.mockup.item1" })}</span>
                    <span className={styles.mockupItemPrice}>$89.00</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#e0f2fe" }}>📱</div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>{t("Wireless Charger", { $id: "register.mockup.item2" })}</span>
                    <span className={styles.mockupItemPrice}>$45.00</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#f0fdf4" }}>🌱</div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>{t("Indoor Plant Kit", { $id: "register.mockup.item3" })}</span>
                    <span className={styles.mockupItemPrice}>$32.00</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.mockupFloat} ${styles.mockupFloat1}`}>
              <span>🎉</span>
              <span>{t("Wishlist created!", { $id: "register.mockup.float1" })}</span>
            </div>
            <div className={`${styles.mockupFloat} ${styles.mockupFloat2}`}>
              <span>👥</span>
              <span>{t("3 friends joined", { $id: "register.mockup.float2" })}</span>
            </div>
          </div>

          <div className={styles.visualTestimonial}>
            <div className={styles.testimonialStars}>★★★★★</div>
            <div className={`${styles.testimonialFade} ${fadeIn ? styles.testimonialVisible : ""}`}>
              <p className={styles.testimonialQuote}>{currentTestimonial.quote}</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar} style={{ background: currentTestimonial.bg, color: currentTestimonial.color }}>{currentTestimonial.initial}</div>
                <span className={styles.testimonialName}>{currentTestimonial.name}</span>
                <span className={styles.testimonialRole}>{currentTestimonial.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Form Panel ─── */}
      <div className={styles.formSide}>
        <div className={styles.formContent}>
          <div className={styles.formHeader}>
            <span className={styles.formBadge}>
              {t("✨ Get started free", { $id: "register.form.badge" })}
            </span>
            <h1 className={styles.formTitle}>
              {t("Create your account", { $id: "register.form.title" })}
            </h1>
            <p className={styles.formSubtitle}>
              {t("Join thousands of happy gift-givers. Free forever, no credit card required.", {
                $id: "register.form.subtitle",
              })}
            </p>
          </div>

          <AuthForm
            mode="register"
            redirectTo={redirectTo}
            onLoginSuccess={(target) => router.replace(target)}
          />

          <p className={styles.formSwitch}>
            {t("Already have an account?", { $id: "register.switch.text" })}{" "}
            <Link href="/login">
              {t("Sign in", { $id: "register.switch.link" })}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
