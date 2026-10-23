"use client";

import { MotionConfig, motion } from "framer-motion";
import { useGT } from "gt-next";
import Link from "next/link";
import { Gift } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { displayFont } from "@/components/marketing/display-font";
import { easeOut } from "@/components/marketing/motion";
import { WishlistDemo } from "@/components/marketing/WishlistDemo";
import styles from "../../login.module.scss";

type Props = {
  visualTitle: ReactNode;
  visualSubtitle: string;
  demo: ComponentProps<typeof WishlistDemo>;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const enter = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

/** Two-panel layout shared by login and register: live list demo left, form right. */
export function AuthShell({
  visualTitle,
  visualSubtitle,
  demo,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  const t = useGT();

  return (
    <MotionConfig reducedMotion="user">
      <main className={`${styles.page} ${displayFont.variable}`}>
        <aside className={styles.visual}>
          <Link href="/" className={styles.visualLogo}>
            <Gift size={20} aria-hidden="true" />
            {t("Wishlane", { $id: "auth.visual.brand" })}
          </Link>
          <motion.div
            className={styles.visualBody}
            {...enter}
            transition={{ duration: 0.25, ease: easeOut, delay: 0.06 }}
          >
            <h2 className={styles.visualTitle}>{visualTitle}</h2>
            <p className={styles.visualSubtitle}>{visualSubtitle}</p>
            <WishlistDemo {...demo} />
          </motion.div>
        </aside>

        <div className={styles.formSide}>
          <motion.div
            className={styles.formContent}
            {...enter}
            transition={{ duration: 0.25, ease: easeOut }}
          >
            <Link href="/" className={styles.formLogo}>
              <Gift size={20} aria-hidden="true" />
              {t("Wishlane", { $id: "auth.visual.brand" })}
            </Link>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>{title}</h1>
              <p className={styles.formSubtitle}>{subtitle}</p>
            </div>
            {children}
            <p className={styles.formSwitch}>{footer}</p>
          </motion.div>
        </div>
      </main>
    </MotionConfig>
  );
}
