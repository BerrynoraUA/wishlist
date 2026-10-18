"use client";

import { motion } from "framer-motion";
import { useGT } from "gt-next";
import Link from "next/link";
import { ArrowRight, ArrowUp, BookOpen, Coffee, Headphones } from "lucide-react";
import type { MouseEvent } from "react";
import { easeOut } from "@/components/marketing/motion";
import { WishlistDemo } from "@/components/marketing/WishlistDemo";
import styles from "../landing.module.scss";

type SmoothScroll = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

const enter = (index: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: easeOut, delay: index * 0.06 },
});

export function Hero({ onSmoothScroll }: { onSmoothScroll: SmoothScroll }) {
  const t = useGT();

  return (
    <header className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <motion.h1 className={styles.heroTitle} {...enter(0)}>
            {t("Everyone's in on it.", { $id: "landing.hero.titleLine1" })}{" "}
            <span className={styles.heroTitleAccent}>
              {t("Except Maya.", { $id: "landing.hero.titleLine2" })}
            </span>
          </motion.h1>
          <motion.p className={styles.heroLead} {...enter(1)}>
            {t(
              "Make a wishlist and share the link. Friends reserve what they're buying, so nobody doubles up, and you never find out who picked what.",
              { $id: "landing.hero.subtitle" },
            )}
          </motion.p>
          <motion.div className={styles.heroActions} {...enter(2)}>
            <Link href="/register" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              {t("Start Your First Wishlist", { $id: "landing.hero.ctaPrimary" })}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className={`${styles.btn} ${styles.btnOutline} ${styles.btnLg}`}
              onClick={(event) => onSmoothScroll(event, "#how-it-works")}
            >
              {t("See How It Works", { $id: "landing.hero.ctaSecondary" })}
            </a>
          </motion.div>
          <motion.p className={styles.heroNote} {...enter(3)}>
            {t("Free forever. No credit card required.", { $id: "landing.hero.note" })}
          </motion.p>
        </div>

        <motion.div className={styles.heroDemo} {...enter(2)}>
          <WishlistDemo
            title={t("Maya's 30th", { $id: "landing.hero.demo.title" })}
            meta={t("March 15, 3 items", { $id: "landing.hero.demo.meta" })}
            accent="pink"
            initialReserved={["headphones"]}
            toggleLabel={t("View the list as", { $id: "landing.hero.demo.toggle" })}
            ownerLabel={t("Maya sees", { $id: "landing.hero.demo.owner" })}
            friendsLabel={t("Her friends see", { $id: "landing.hero.demo.friends" })}
            ownerNote={t("Can't tell. That's the point.", { $id: "landing.hero.demo.ownerNote" })}
            items={[
              {
                id: "headphones",
                name: t("Wireless headphones", { $id: "landing.hero.demo.item1" }),
                store: "sony.com",
                price: "$149.99",
                accent: "pink",
                Icon: Headphones,
                priority: { kind: "star" },
              },
              {
                id: "book",
                name: t("Design anthology", { $id: "landing.hero.demo.item2" }),
                store: "phaidon.com",
                price: "$34.00",
                accent: "blue",
                Icon: BookOpen,
                priority: {
                  kind: "badge",
                  label: t("High", { $id: "landing.hero.demo.priorityHigh" }),
                  color: "var(--wl-priority-high)",
                  Icon: ArrowUp,
                },
              },
              {
                id: "pour-over",
                name: t("Pour-over set", { $id: "landing.hero.demo.item3" }),
                store: "hario.co",
                price: "$62.00",
                accent: "peach",
                Icon: Coffee,
              },
            ]}
          />
          <p className={styles.heroDemoHint}>
            {t("Try it: reserve something, then switch to Maya's view.", {
              $id: "landing.hero.demo.hint",
            })}
          </p>
        </motion.div>
      </div>
    </header>
  );
}
