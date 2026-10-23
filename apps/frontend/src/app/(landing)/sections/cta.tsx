"use client";

import { useGT } from "gt-next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import styles from "../landing.module.scss";

export function Cta() {
  const t = useGT();

  return (
    <section className={styles.ctaSection}>
      <div className={styles.container}>
        <Reveal className={styles.ctaPanel}>
          <h2 className={styles.ctaTitle}>
            {t("Next birthday's coming. Get the list out first.", { $id: "landing.cta.title" })}
          </h2>
          <div className={styles.ctaActions}>
            <Link href="/register" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              {t("Start Your First Wishlist", { $id: "landing.cta.button" })}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className={styles.ctaNote}>
              {t("Free forever. No credit card required.", { $id: "landing.cta.note" })}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
