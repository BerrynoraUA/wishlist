"use client";

import { Button } from "@/components/ui/Button/Button";
import styles from "./SecretSantaHeader.module.scss";
import { Plus, TreePine } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-user";

function getDisplayName(nameSource?: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
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
  return "there";
}

type Props = {
  onNewEvent: () => void;
};

export function SecretSantaHeader({ onNewEvent }: Props) {
  const { data: user } = useCurrentUser();
  const displayName = getDisplayName(user ?? undefined);

  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <TreePine size={28} className={styles.headerIcon} />
          <h1>Secret Santa</h1>
        </div>
        <p>
          Organize gift exchanges with your friends, {displayName}. Create an
          event, add participants, and let the magic happen!
        </p>
      </div>

      <div className={styles.actions}>
        <Button size="sm" onClick={onNewEvent}>
          <Plus size={18} />
          <span>New Event</span>
        </Button>
      </div>
    </div>
  );
}
