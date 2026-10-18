"use client";

import { useGT } from "gt-next";
import { Bell, CalendarClock, Eye, Link2, Palette, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import type { DemoItem } from "@/components/marketing/DemoItemCard";
import styles from "../landing.module.scss";

type Feature = { Icon: LucideIcon; accent: DemoItem["accent"]; title: string; desc: string };

export function Features() {
  const t = useGT();

  const features: Feature[] = [
    {
      Icon: Link2,
      accent: "blue",
      title: t("Paste any link", { $id: "landing.features.link.title" }),
      desc: t(
        "Drop in a product URL from any store. Wishlane fills in the title, image and price.",
        {
          $id: "landing.features.link.desc",
        },
      ),
    },
    {
      Icon: Palette,
      accent: "pink",
      title: t("A colour per list", { $id: "landing.features.colour.title" }),
      desc: t(
        "Five list colours, a description and an event date, so each list is easy to tell apart.",
        {
          $id: "landing.features.colour.desc",
        },
      ),
    },
    {
      Icon: Eye,
      accent: "lavender",
      title: t("You pick who sees it", { $id: "landing.features.privacy.title" }),
      desc: t("Public, friends only, or private. Set it per list and change it any time.", {
        $id: "landing.features.privacy.desc",
      }),
    },
    {
      Icon: UserPlus,
      accent: "mint",
      title: t("Friends by link or username", { $id: "landing.features.friends.title" }),
      desc: t(
        "Send your invite link, or search for someone's username. They see your lists, you see theirs.",
        {
          $id: "landing.features.friends.desc",
        },
      ),
    },
    {
      Icon: CalendarClock,
      accent: "peach",
      title: t("Countdowns to the day", { $id: "landing.features.countdown.title" }),
      desc: t(
        "Friends' birthdays and events show up with the days left and their list one tap away.",
        {
          $id: "landing.features.countdown.desc",
        },
      ),
    },
    {
      Icon: Bell,
      accent: "blue",
      title: t("Only the useful pings", { $id: "landing.features.notifications.title" }),
      desc: t("Hear when a friend adds a list or sends you a request.", {
        $id: "landing.features.notifications.desc",
      }),
    },
  ];

  return (
    <section className={styles.section} id="features">
      <div className={`${styles.container} ${styles.featuresLayout}`}>
        <Reveal className={styles.featuresIntro}>
          <h2 className={styles.sectionTitle}>
            {t("The small stuff, already handled", { $id: "landing.features.title" })}
          </h2>
        </Reveal>
        <ul className={styles.featureList}>
          {features.map(({ Icon, accent, title, desc }, index) => (
            <Reveal as="li" key={title} index={index % 2} className={styles.feature}>
              <span
                className={styles.featureIcon}
                style={{ background: `var(--accent-${accent})` }}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
