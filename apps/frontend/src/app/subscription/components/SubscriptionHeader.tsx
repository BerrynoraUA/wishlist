import styles from "./SubscriptionHeader.module.scss";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionPlan } from "@/types/subscription";

export function SubscriptionHeader() {
  const { plan, isPro, expiresAt } = useSubscription();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Choose Your Plan</h1>
      <p className={styles.subtitle}>
        Unlock the full power of Wishly with Pro — price tracking, sale alerts,
        collaborative wishlists, and more.
      </p>

      {isPro && (
        <div className={styles.currentPlan}>
          <span className={styles.proBadge}>PRO</span>
          <span className={styles.planText}>
            You&apos;re on the Pro plan
            {expiresAt && (
              <>
                {" "}
                · Renews{" "}
                {new Date(expiresAt).toLocaleDateString("en-US", {
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
          <span className={styles.freeBadge}>FREE</span>
          <span className={styles.planText}>You&apos;re on the Free plan</span>
        </div>
      )}
    </div>
  );
}
