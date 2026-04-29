"use client";

import { useGT } from "gt-next";
import styles from "../landing.module.scss";
import { SectionHeader, Testimonial } from "./shared";

export function Testimonials() {
  const t = useGT();

  return (
    <section className={styles.testimonials} id="testimonials">
      <div className={styles.container}>
        <SectionHeader
          badge={t("Testimonials", { $id: "landing.testimonials.badge" })}
          title={
            <>
              {t("Loved by", { $id: "landing.testimonials.titlePart1" })}{" "}
              <em>{t("gift-givers", { $id: "landing.testimonials.titleEmphasis" })}</em>{" "}
              {t("everywhere", { $id: "landing.testimonials.titlePart2" })}
            </>
          }
        />
        <div className={styles.testimonialsGrid}>
          <Testimonial
            text={t(
              "Wishlane changed how our family does holidays. No more duplicate gifts and everyone knows what to get.",
              { $id: "landing.testimonials.quote1" },
            )}
            name={t("Sarah Johnson", { $id: "landing.testimonials.author1.name" })}
            role={t("Mom of 3", { $id: "landing.testimonials.author1.role" })}
            initial="S"
            bg="#fde7f3"
            color="#c0267e"
          />
          <Testimonial
            text={t(
              "The link scraping feature is magic. I paste an Amazon link and everything fills in automatically.",
              { $id: "landing.testimonials.quote2" },
            )}
            name={t("Jake Rivera", { $id: "landing.testimonials.author2.name" })}
            role={t("Tech Enthusiast", { $id: "landing.testimonials.author2.role" })}
            initial="J"
            bg="#e0f2fe"
            color="#2563eb"
            delay={100}
          />
          <Testimonial
            text={t(
              "I love the reservation system. I can claim a gift and nobody else sees it, so surprises stay intact.",
              { $id: "landing.testimonials.quote3" },
            )}
            name={t("Emma Nakamura", { $id: "landing.testimonials.author3.name" })}
            role={t("Gift Connoisseur", { $id: "landing.testimonials.author3.role" })}
            initial="E"
            bg="#f0fdf4"
            color="#16a34a"
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}
