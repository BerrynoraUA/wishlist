"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useGT } from "gt-next";
import { Gift } from "lucide-react";
import styles from "../login/login.module.scss";
import { AuthForm } from "../login/components/auth-form/AuthForm";
import { useRegisterPage } from "./hooks/use-register-page";

function RegisterPageContent() {
  const t = useGT();
  const router = useRouter();
  const { redirectTo, loginHref, currentTestimonial, fadeIn } = useRegisterPage();

  return (
    <main className={styles.page}>
      {/* ─── Visual Panel ─── */}
      <div className={styles.visual}>
        <div className={`${styles.visualBlob} ${styles.visualBlob1}`} />
        <div className={`${styles.visualBlob} ${styles.visualBlob2}`} />
        <div className={`${styles.visualBlob} ${styles.visualBlob3}`} />

        <div className={styles.visualContent}>
          <span className={styles.visualLogo}>
            <span className={styles.visualLogoIcon}>
              <Gift size={20} />
            </span>{" "}
            {t("Wishlane", { $id: "auth.visual.brand" })}
          </span>
          <h2 className={styles.visualTitle}>
            {t("Start your", { $id: "register.visual.titleLine1" })}
            <br />
            <em>{t("gifting journey", { $id: "register.visual.titleEmphasis" })}</em>
          </h2>
          <p className={styles.visualSubtitle}>
            {t(
              "Create stunning wishlists, share them with friends and family, and never miss the perfect gift again.",
              {
                $id: "register.visual.subtitle",
              },
            )}
          </p>

          <div className={styles.visualMockup}>
            <div className={styles.mockupCard}>
              <div className={styles.mockupCardHeader}>
                <div className={styles.mockupCardIcon}>
                  <Gift size={18} />
                </div>
                <div>
                  <div className={styles.mockupCardTitle}>
                    {t("Christmas 2026 🎄", { $id: "register.mockup.title" })}
                  </div>
                  <span className={styles.mockupCardMeta}>
                    {t("{count} items · {date}", {
                      count: 5,
                      date: "Dec 25",
                      $id: "register.mockup.meta",
                    })}
                  </span>
                </div>
              </div>
              <div className={styles.mockupCardItems}>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#fde7f3" }}>
                    🎁
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Cozy Wool Sweater", { $id: "register.mockup.item1" })}
                    </span>
                    <span className={styles.mockupItemPrice}>$89.00</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#e0f2fe" }}>
                    📱
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Wireless Charger", { $id: "register.mockup.item2" })}
                    </span>
                    <span className={styles.mockupItemPrice}>$45.00</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#f0fdf4" }}>
                    🌱
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Indoor Plant Kit", { $id: "register.mockup.item3" })}
                    </span>
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
                <div
                  className={styles.testimonialAvatar}
                  style={{
                    background: currentTestimonial.bg,
                    color: currentTestimonial.color,
                  }}
                >
                  {currentTestimonial.initial}
                </div>
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
            <Link href={loginHref}>{t("Sign in", { $id: "register.switch.link" })}</Link>
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
