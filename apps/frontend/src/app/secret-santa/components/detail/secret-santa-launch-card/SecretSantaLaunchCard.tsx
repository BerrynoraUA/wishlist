"use client";

import { useGT } from "gt-next";
import { Button } from "@/components/ui/Button/Button";
import { CircleDashed, Sparkles } from "lucide-react";
import styles from "./SecretSantaLaunchCard.module.scss";

type Props = {
  canLaunch: boolean;
  pendingInvitesCount: number;
  participantsCount: number;
  onLaunch?: () => void;
};

export function SecretSantaLaunchCard({ canLaunch, onLaunch }: Props) {
  const t = useGT();

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <CircleDashed size={16} />
        <span>{t("Launch event", { $id: "secretSanta.launchCard.title" })}</span>
      </div>

      <Button disabled={!canLaunch} onClick={onLaunch}>
        <Sparkles size={16} />
        <span>
          {t("Launch Secret Santa", {
            $id: "secretSanta.launchCard.button",
          })}
        </span>
      </Button>
    </section>
  );
}
