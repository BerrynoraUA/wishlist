"use client";

import { useGT } from "gt-next";
import { Button } from "@/components/ui/Button/Button";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import styles from "./SecretSantaHeader.module.scss";
import { Plus, TreePine } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-user";

function getDisplayName(
  nameSource: { email?: string | null; user_metadata?: Record<string, unknown> } | undefined,
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
  const { data: user } = useCurrentUser();
  const displayName = getDisplayName(
    user ?? undefined,
    t("there", { $id: "secretSanta.header.guestName" }),
  );

  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <TreePine size={28} className={styles.headerIcon} />
          <h1>{t("Secret Santa", { $id: "secretSanta.header.title" })}</h1>
          <ProBadge size="sm" label={t("NEW", { $id: "secretSanta.newBadge" })} />
        </div>
        <p>
          {t(
            "Organize gift exchanges with your friends, {name}. Create an event, add participants, and let the magic happen!",
            { name: displayName, $id: "secretSanta.header.subtitle" },
          )}
        </p>
      </div>

      <div className={styles.actions}>
        <Button size="sm" onClick={onNewEvent}>
          <Plus size={18} />
          <span>{t("New Event", { $id: "secretSanta.header.newEvent" })}</span>
        </Button>
      </div>
    </div>
  );
}
