"use client";

import { useGT } from "gt-next";
import Link from "next/link";
import { ArrowUp, CalendarClock, Flame, Footprints } from "lucide-react";
import { useState } from "react";
import { DemoItemCard } from "@/components/marketing/DemoItemCard";
import { Reveal } from "@/components/marketing/Reveal";
import styles from "../landing.module.scss";

export function Discover() {
  const t = useGT();
  const [reserved, setReserved] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (id: string) =>
    setReserved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={styles.section} id="discover">
      <div className={`${styles.container} ${styles.discoverLayout}`}>
        <Reveal className={styles.discoverCopy}>
          <h2 className={styles.sectionTitle}>
            {t("Never show up empty-handed", { $id: "landing.discover.title" })}
          </h2>
          <p className={styles.sectionLead}>
            {t(
              "Discover shows your friends' upcoming birthdays and events, how many days are left, and what's still up for grabs on their lists.",
              { $id: "landing.discover.subtitle" },
            )}
          </p>
        </Reveal>

        <Reveal index={1} className={styles.discoverDemo}>
          <div className={styles.eventBanner}>
            <span className={styles.eventIcon} aria-hidden="true">
              <CalendarClock size={20} />
            </span>
            <p className={styles.eventText}>
              {t("Alex's birthday is in", { $id: "landing.discover.eventLead" })}{" "}
              <strong>{t("{count} days", { count: 12, $id: "landing.discover.countdown" })}</strong>
            </p>
            <Link href="/register" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
              {t("View Wishlist", { $id: "landing.discover.viewWishlist" })}
            </Link>
          </div>
          <div className={styles.discoverCards}>
            <DemoItemCard
              item={{
                id: "sneakers",
                name: t("Air Jordan 1 Retro", { $id: "landing.discover.card1.title" }),
                store: "nike.com",
                price: "$180.00",
                accent: "mint",
                Icon: Footprints,
                priority: {
                  kind: "badge",
                  label: t("High", { $id: "landing.discover.priorityHigh" }),
                  color: "var(--wl-priority-high)",
                  Icon: ArrowUp,
                },
              }}
              reserved={reserved.has("sneakers")}
              onToggle={() => toggle("sneakers")}
            />
            <DemoItemCard
              item={{
                id: "candle",
                name: t("Baies scented candle", { $id: "landing.discover.card3.title" }),
                store: "diptyqueparis.com",
                price: "$76.00",
                accent: "peach",
                Icon: Flame,
              }}
              reserved={reserved.has("candle")}
              onToggle={() => toggle("candle")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
