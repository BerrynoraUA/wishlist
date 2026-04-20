"use client";

import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import styles from "./SecretSantaHeader.module.scss";
import { Plus, TreePine, Sparkles } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { useSecretSantaEvents } from "@/hooks/use-secret-santa";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { FREE_LIMITS } from "@/types/subscription";

function getDisplayName(
  nameSource:
    | { email?: string | null; user_metadata?: Record<string, unknown> }
    | undefined,
  fallbackThere: string,
): string {
  const metadata = (nameSource?.user_metadata ?? {}) as Record<string, unknown>;
  const rawFull = metadata.full_name ?? metadata.name;
  const rawFirst = metadata.first_name;
  const rawLast = metadata.last_name;

  const fullName =
    (typeof rawFull === "string" && rawFull) ||
    [
      typeof rawFirst === "string" ? rawFirst : undefined,
      typeof rawLast === "string" ? rawLast : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (fullName) return fullName;
  if (nameSource?.email) return nameSource.email.split("@")[0];
  return fallbackThere;
}

type Props = {
  onNewEvent: () => void;
};

export function SecretSantaHeader({ onNewEvent }: Props) {
  const t = useGT();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { isPro } = useSubscription();
  const { data: eventsData } = useSecretSantaEvents();
  const eventCount = eventsData?.total ?? 0;
  const atLimit =
    SUBSCRIPTIONS_UI_ENABLED &&
    !isPro &&
    eventCount >= FREE_LIMITS.maxSecretSantaEvents;
  const displayName = getDisplayName(
    user ?? undefined,
    t("there", { $id: "secretSanta.header.guestName" }),
  );

  function handleNewEvent() {
    if (atLimit) {
      router.push("/subscription");
      return;
    }
    onNewEvent();
  }

  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <TreePine size={28} className={styles.headerIcon} />
          <h1>{t("Secret Santa", { $id: "secretSanta.header.title" })}</h1>
          <ProBadge
            size="sm"
            label={t("NEW", { $id: "secretSanta.newBadge" })}
          />
        </div>
        <p>
          {t(
            "Organize gift exchanges with your friends, {name}. Create an event, add participants, and let the magic happen!",
            { name: displayName, $id: "secretSanta.header.subtitle" },
          )}
        </p>
      </div>

      <div className={styles.actions}>
        {SUBSCRIPTIONS_UI_ENABLED && !isPro && (
          <span className={styles.limitCounter}>
            {t("{current}/{max} events", {
              current: eventCount,
              max: FREE_LIMITS.maxSecretSantaEvents,
              $id: "secretSanta.header.eventLimit",
            })}
          </span>
        )}
        <Button size="sm" onClick={handleNewEvent}>
          {atLimit ? (
            <>
              <Sparkles size={18} />
              <span>
                {t("Upgrade to Add", {
                  $id: "secretSanta.header.upgradeToAdd",
                })}
              </span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span>
                {t("New Event", { $id: "secretSanta.header.newEvent" })}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
