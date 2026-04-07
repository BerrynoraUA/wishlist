"use client";

import { useRouter } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import styles from "./ProGate.module.scss";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/Button/Button";

type Props = {
  children: React.ReactNode;
  /** Custom message shown on the locked overlay */
  message?: string;
};

/**
 * Wraps children with a blurred lock overlay when the user is on the Free plan.
 * If the user is Pro, renders children normally.
 */
export function ProGate({
  children,
  message = "Upgrade to Pro to unlock this feature",
}: Props) {
  const { isPro, isLoading } = useSubscription();
  const router = useRouter();

  if (isLoading || isPro) {
    return <>{children}</>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>{children}</div>
      <div className={styles.overlay}>
        <div className={styles.lockCard}>
          <div className={styles.iconWrapper}>
            <Lock size={22} />
          </div>
          <p className={styles.message}>{message}</p>
          <Button
            variant="primary"
            onClick={() => router.push("/subscription")}
          >
            <Sparkles size={16} />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
