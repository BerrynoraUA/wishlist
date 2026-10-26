"use client";

import { useGT, useLocale } from "gt-next";
import styles from "./SubscriptionHeader.module.scss";
import { useManageSubscription, useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/Button/Button";
import { SubscriptionPlan } from "@/types/subscription";

export function SubscriptionHeader() {
  const t = useGT();
  const locale = useLocale();
  const { plan, isPro, expiresAt } = useSubscription();
  const manageSubscription = useManageSubscription();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>
        {isPro
          ? t("Your subscription", { $id: "subscription.header.yourSubscription" })
          : t("Choose Your Plan", { $id: "subscription.header.title" })}
      </h1>
      <p className={styles.subtitle}>
        {isPro
          ? t("Manage your Pro access and compare billing options below.", {
              $id: "subscription.header.manageDescription",
            })
          : t(
              "Unlock the full power of Wishlane with Pro — unlimited lists, collaborative wishlists, and more.",
              { $id: "subscription.header.subtitle" },
            )}
      </p>

      {isPro && (
        <section
          className={styles.subscriptionSummary}
          aria-label={t("Current subscription", {
            $id: "subscription.header.currentSubscription",
          })}
        >
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
                  {t("· Access through", {
                    $id: "subscription.header.accessThrough",
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
          <p className={styles.billingDetails}>
            {t(
              "Your billing interval and billed amount aren't available here. Check your billing provider for those details.",
              {
                $id: "subscription.header.billingDetailsUnavailable",
              },
            )}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => manageSubscription.mutate()}
            disabled={manageSubscription.isPending}
          >
            {manageSubscription.isPending
              ? t("Opening...", { $id: "subscription.pricing.openingManagement" })
              : t("Manage subscription", { $id: "subscription.pricing.manageSubscription" })}
          </Button>
        </section>
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
