"use client";

import { useGT } from "gt-next";
import styles from "../landing.module.scss";
import { FeatureCard, SectionHeader } from "./shared";

export function Features() {
  const t = useGT();

  return (
    <section className={styles.features} id="features">
      <div className={styles.container}>
        <SectionHeader
          badge={t("Features", { $id: "landing.features.badge" })}
          title={
            <>
              {t("Everything you need for", { $id: "landing.features.titlePart1" })}{" "}
              <em>{t("perfect", { $id: "landing.features.titleEmphasis" })}</em>{" "}
              {t("gifting", { $id: "landing.features.titlePart2" })}
            </>
          }
          subtitle={t(
            "From creating wishlists to discovering what your friends want - Wishlane handles every part of the gifting journey.",
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
            title={t("Beautiful Wishlists", { $id: "landing.features.card1.title" })}
            desc={t(
              "Create stunning wishlists with custom colors, descriptions, and event dates. Choose from five accent colors to make each list unique.",
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
            title={t("Smart Link Scraping", { $id: "landing.features.card2.title" })}
            desc={t(
              "Paste any product URL and Wishlane auto-fills the title, description, image, and price.",
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
            title={t("Friends & Sharing", { $id: "landing.features.card3.title" })}
            desc={t(
              "Connect with friends via invite links or username search. Share wishlists publicly, with friends only, or keep them private.",
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
            title={t("Gift Reservations", { $id: "landing.features.card4.title" })}
            desc={t(
              "Reserve items on friends' wishlists so nobody buys the same gift. Only you can see your reservations.",
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
            title={t("Real-Time Notifications", { $id: "landing.features.card5.title" })}
            desc={t("Get notified when friends add wishlists, send requests, or reserve an item.", {
              $id: "landing.features.card5.desc",
            })}
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
            title={t("Discover & Explore", { $id: "landing.features.card6.title" })}
            desc={t(
              "Browse friends' public wishlists, see upcoming events with countdowns, and find the right gift.",
              { $id: "landing.features.card6.desc" },
            )}
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}
