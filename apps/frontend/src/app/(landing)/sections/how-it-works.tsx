"use client";

import { useGT } from "gt-next";
import styles from "../landing.module.scss";
import { DemoFriend, DemoReserve, SectionHeader, StepDemoCreate } from "./shared";

export function HowItWorks() {
  const t = useGT();

  return (
    <section className={styles.howItWorks} id="how-it-works">
      <div className={styles.container}>
        <SectionHeader
          badge={t("How It Works", { $id: "landing.how.badge" })}
          title={
            <>
              {t("Three steps to", { $id: "landing.how.titlePart1" })}{" "}
              <em>{t("gifting joy", { $id: "landing.how.titleEmphasis" })}</em>
            </>
          }
          subtitle={t("Getting started with Wishlane is as easy as making a wish.", {
            $id: "landing.how.subtitle",
          })}
        />
        <div className={styles.steps}>
          <div className={`${styles.step} ${styles.animateIn}`}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t("Create Your Wishlist", { $id: "landing.how.step1.title" })}
              </h3>
              <p className={styles.stepDesc}>
                {t(
                  "Name it, pick a color, set an event date, and choose who can see it. Add items by pasting links and Wishlane fills the details.",
                  { $id: "landing.how.step1.desc" },
                )}
              </p>
            </div>
            <div className={styles.stepVisual}>
              <StepDemoCreate />
            </div>
          </div>

          <div className={`${styles.step} ${styles.animateIn}`} data-delay="150">
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t("Share With Friends", { $id: "landing.how.step2.title" })}
              </h3>
              <p className={styles.stepDesc}>
                {t(
                  "Invite friends by sharing your unique link or searching their username. They will see your wishlists and you will see theirs.",
                  { $id: "landing.how.step2.desc" },
                )}
              </p>
            </div>
            <div className={styles.stepVisual}>
              <div className={`${styles.stepDemo} ${styles.stepDemoShare}`}>
                <div className={styles.demoInvite}>
                  <span className={styles.demoInviteLabel}>
                    {t("Your invite link", { $id: "landing.how.step2.inviteLabel" })}
                  </span>
                  <div className={styles.demoInviteLink}>
                    <span>wishlane.net/invite/sarah_j</span>
                    <span className={styles.demoInviteCopy}>
                      {t("Copied!", { $id: "landing.how.step2.copied" })}
                    </span>
                  </div>
                </div>
                <div className={styles.demoFriends}>
                  <DemoFriend
                    initial="A"
                    bg="#fde7f3"
                    color="#c0267e"
                    name={t("Alex Chen", { $id: "landing.how.step2.friend1.name" })}
                    user="@alexc"
                  />
                  <DemoFriend
                    initial="M"
                    bg="#e0f2fe"
                    color="#2563eb"
                    name={t("Maya Patel", { $id: "landing.how.step2.friend2.name" })}
                    user="@mayap"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.step} ${styles.animateIn}`} data-delay="300">
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t("Reserve & Surprise", { $id: "landing.how.step3.title" })}
              </h3>
              <p className={styles.stepDesc}>
                {t(
                  "Browse friends' wishlists and reserve items secretly. No duplicate gifts and no ruined surprises.",
                  { $id: "landing.how.step3.desc" },
                )}
              </p>
            </div>
            <div className={styles.stepVisual}>
              <DemoReserve />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
