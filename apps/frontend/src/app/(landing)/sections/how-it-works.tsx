"use client";

import { motion } from "framer-motion";
import { useGT } from "gt-next";
import { Check, Gamepad2, Link2, Users } from "lucide-react";
import { useState } from "react";
import { DemoItemCard } from "@/components/marketing/DemoItemCard";
import type { DemoItem } from "@/components/marketing/DemoItemCard";
import { pressSpring, tap } from "@/components/marketing/motion";
import { Reveal } from "@/components/marketing/Reveal";
import styles from "../landing.module.scss";

const ACCENTS: DemoItem["accent"][] = ["pink", "blue", "peach", "mint", "lavender"];

function ListColourPicker() {
  const t = useGT();
  const [accent, setAccent] = useState<DemoItem["accent"]>("pink");
  const names: Record<DemoItem["accent"], string> = {
    pink: t("Pink", { $id: "landing.how.colour.pink" }),
    blue: t("Blue", { $id: "landing.how.colour.blue" }),
    peach: t("Peach", { $id: "landing.how.colour.peach" }),
    mint: t("Mint", { $id: "landing.how.colour.mint" }),
    lavender: t("Lavender", { $id: "landing.how.colour.lavender" }),
  };

  return (
    <div className={styles.stepPanel}>
      <div className={styles.listPreview}>
        <span
          className={styles.listPreviewSwatch}
          style={{ background: `var(--accent-${accent})` }}
        />
        <span className={styles.listPreviewName}>
          {t("Maya's 30th", { $id: "landing.how.step1.listName" })}
        </span>
      </div>
      <div
        className={styles.swatches}
        role="radiogroup"
        aria-label={t("List colour", { $id: "landing.how.step1.colours" })}
      >
        {ACCENTS.map((value) => (
          <motion.button
            key={value}
            type="button"
            role="radio"
            aria-checked={accent === value}
            aria-label={names[value]}
            className={styles.swatch}
            style={{ background: `var(--accent-${value})` }}
            onClick={() => setAccent(value)}
            whileTap={tap}
            transition={pressSpring}
          >
            {accent === value && <Check size={14} strokeWidth={3} aria-hidden="true" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function SharePreview() {
  const t = useGT();

  return (
    <div className={styles.stepPanel}>
      <div className={styles.shareRow}>
        <Link2 size={16} aria-hidden="true" />
        <span className={styles.shareUrl}>wishlane.net/share?token=…</span>
      </div>
      <p className={styles.shareAudience}>
        <Users size={14} aria-hidden="true" />
        {t("Visible to friends only", { $id: "landing.how.step2.audience" })}
      </p>
    </div>
  );
}

function ReservePreview() {
  const t = useGT();
  const [reserved, setReserved] = useState(false);

  return (
    <div className={`${styles.stepPanel} ${styles.stepPanelCard}`}>
      <DemoItemCard
        item={{
          id: "controller",
          name: t("Wireless controller", { $id: "landing.how.step3.item" }),
          store: "playstation.com",
          price: "$69.99",
          accent: "lavender",
          Icon: Gamepad2,
        }}
        reserved={reserved}
        onToggle={() => setReserved((value) => !value)}
      />
    </div>
  );
}

export function HowItWorks() {
  const t = useGT();

  const steps = [
    {
      title: t("Make a list", { $id: "landing.how.step1.title" }),
      desc: t(
        "Name it, pick a colour, set the date. Add items by pasting links and the details fill themselves in.",
        { $id: "landing.how.step1.desc" },
      ),
      visual: <ListColourPicker />,
    },
    {
      title: t("Share the link", { $id: "landing.how.step2.title" }),
      desc: t(
        "Send it to the people who'll be buying. Choose whether it's public, friends only, or private.",
        {
          $id: "landing.how.step2.desc",
        },
      ),
      visual: <SharePreview />,
    },
    {
      title: t("Friends reserve, quietly", { $id: "landing.how.step3.title" }),
      desc: t(
        "Each friend reserves what they'll get. Everyone else sees it's taken. You see nothing.",
        {
          $id: "landing.how.step3.desc",
        },
      ),
      visual: <ReservePreview />,
    },
  ];

  return (
    <section className={`${styles.section} ${styles.sectionAlt}`} id="how-it-works">
      <div className={styles.container}>
        <Reveal>
          <h2 className={styles.sectionTitle}>{t("How It Works", { $id: "landing.how.title" })}</h2>
        </Reveal>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} index={index} className={styles.step}>
              {step.visual}
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
