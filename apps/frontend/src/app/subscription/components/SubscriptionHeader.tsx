"use client";

import { useGT, useLocale } from "gt-next";
import styles from "./SubscriptionHeader.module.scss";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionPlan } from "@/types/subscription";

export function SubscriptionHeader() {
  const t = useGT();
  const locale = useLocale();
  const { plan, isPro, expiresAt } = useSubscription();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>
        {t("Choose Your Plan", { $id: "subscription.header.title" })}
      </h1>
      <p className={styles.subtitle}>
        {t(
          "Unlock the full power of Wishlane with Pro — price tracking, sale alerts, collaborative wishlists, and more.",
          { $id: "subscription.header.subtitle" },
        )}
      </p>

      {isPro && (
        <div className={styles.currentPlan}>
          <span className={styles.proBadge}>
            {t("PRO", { $id: "subscription.header.badgePro" })}
          </span>
          <span className={styles.planText}>
            {t("You're on the Pro plan", {
              $id: "subscription.header.onProPlan",
            })}
            {expiresAt && (
              <>
                {" "}
                {t("· Renews", {
                  $id: "subscription.header.renewsPrefix",
                })}{" "}
                {new Date(expiresAt).toLocaleDateString(locale ?? "en", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            )}
          </span>
        </div>
      )}

      {plan === SubscriptionPlan.Free && (
        <div className={styles.currentPlan}>
          <span className={styles.freeBadge}>
            {t("FREE", { $id: "subscription.header.badgeFree" })}
          </span>
          <span className={styles.planText}>
            {t("You're on the Free plan", {
              $id: "subscription.header.onFreePlan",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
