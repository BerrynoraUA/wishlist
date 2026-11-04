"use client";

import { useGT } from "gt-next";
import Image from "next/image";
import Link from "next/link";
import styles from "../landing.module.scss";

export function Cta() {
  const t = useGT();

  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <div className={`${styles.ctaCard} ${styles.animateIn}`}>
          <div className={styles.ctaBg}>
            <div className={`${styles.ctaBlob} ${styles.ctaBlob1}`} />
            <div className={`${styles.ctaBlob} ${styles.ctaBlob2}`} />
          </div>
          <Image
            src="/mascot/happy-pointing-down.webp"
            alt=""
            width={120}
            height={120}
            className={styles.ctaMascot}
          />
          <h2 className={styles.ctaTitle}>
            {t("Ready to make gifting", { $id: "landing.cta.titlePart1" })}{" "}
            <em>{t("magical", { $id: "landing.cta.titleEmphasis" })}</em>?
          </h2>
          <p className={styles.ctaSubtitle}>
            {t(
              "Make your first list in under a minute. Your friends will know exactly what to get.",
              { $id: "landing.cta.subtitle" },
            )}
          </p>
          <div className={styles.ctaActions}>
            <Link href="/register" className={`${styles.btn} ${styles.btnWhite} ${styles.btnLg}`}>
              {t("Create Your First Wishlist", { $id: "landing.cta.button" })}
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
            {t("Free forever · Ready in 30 seconds", {
              $id: "landing.cta.note",
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
