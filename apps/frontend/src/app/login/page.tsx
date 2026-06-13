"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useGT } from "gt-next";
import { Gift } from "lucide-react";
import styles from "./login.module.scss";
import { AuthForm } from "./components/auth-form/AuthForm";
import { useLoginPage } from "./hooks/use-login-page";

function LoginPageContent() {
  const t = useGT();
  const router = useRouter();
  const { redirectTo, prefillEmail, registerHref, currentTestimonial, fadeIn } = useLoginPage();

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
            {t("Welcome back to", { $id: "login.visual.titleLine1" })}
            <br />
            <em>{t("Wishlane", { $id: "login.visual.titleEmphasis" })}</em>
          </h2>
          <p className={styles.visualSubtitle}>
            {t(
              "Sign in to manage your wishlists, see what friends are wishing for, and never miss the perfect gift.",
              {
                $id: "login.visual.subtitle",
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
                    {t("Birthday Wishes 🎂", { $id: "login.mockup.title" })}
                  </div>
                  <span className={styles.mockupCardMeta}>
                    {t("{count} items · {date}", {
                      count: 8,
                      date: "March 15",
                      $id: "login.mockup.meta",
                    })}
                  </span>
                </div>
              </div>
              <div className={styles.mockupCardItems}>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#fde7f3" }}>
                    🎧
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Wireless Headphones", { $id: "login.mockup.item1" })}
                    </span>
                    <span className={styles.mockupItemPrice}>$149.99</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#e0f2fe" }}>
                    📚
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Design Anthology", { $id: "login.mockup.item2" })}
                    </span>
                    <span className={styles.mockupItemPrice}>$34.00</span>
                  </div>
                </div>
                <div className={styles.mockupItem}>
                  <div className={styles.mockupItemIcon} style={{ background: "#fef3c7" }}>
                    ☕
                  </div>
                  <div className={styles.mockupItemInfo}>
                    <span className={styles.mockupItemName}>
                      {t("Ceramic Pour-Over", { $id: "login.mockup.item3" })}
                    </span>
                    <span className={styles.mockupItemPrice}>$62.00</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.mockupFloat} ${styles.mockupFloat1}`}>
              <span>❤️</span>
              <span>{t("Item reserved!", { $id: "login.mockup.float1" })}</span>
            </div>
            <div className={`${styles.mockupFloat} ${styles.mockupFloat2}`}>
              <span>🔗</span>
              <span>{t("Link shared", { $id: "login.mockup.float2" })}</span>
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
              {t("✨ Welcome back", { $id: "login.form.badge" })}
            </span>
            <h1 className={styles.formTitle}>
              {t("Sign in to your account", { $id: "login.form.title" })}
            </h1>
            <p className={styles.formSubtitle}>
              {t("Enter your credentials to continue where you left off.", {
                $id: "login.form.subtitle",
              })}
            </p>
          </div>

          <AuthForm
            mode="login"
            redirectTo={redirectTo}
            initialEmail={prefillEmail}
            onLoginSuccess={(target) => router.replace(target)}
          />

          <p className={styles.formSwitch}>
            {t("Don't have an account?", { $id: "login.switch.text" })}{" "}
            <Link href={registerHref}>{t("Create one", { $id: "login.switch.link" })}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
