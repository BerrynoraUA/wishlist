"use client";

import { useGT } from "gt-next";
import type { SecretSantaPerson } from "@/api/types/secret-santa";
import { Sparkles } from "lucide-react";
import { SecretSantaPersonAvatar } from "../secret-santa-person-avatar/SecretSantaPersonAvatar";
import styles from "./SecretSantaReceiverCard.module.scss";

type Props = {
  receiver: SecretSantaPerson;
};

export function SecretSantaReceiverCard({ receiver }: Props) {
  const t = useGT();

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <Sparkles size={16} />
        <span>{t("Your receiver", { $id: "secretSanta.receiverCard.title" })}</span>
      </div>

      <div className={styles.body}>
        <SecretSantaPersonAvatar person={receiver} size="md" />
        <div className={styles.meta}>
          <strong>
            {receiver.display_name ??
              receiver.nickname ??
              t("Assigned person", {
                $id: "secretSanta.receiverCard.assignedFallback",
              })}
          </strong>
          <span>
            {receiver.nickname
              ? `@${receiver.nickname}`
              : t("Your Secret Santa match", {
                  $id: "secretSanta.receiverCard.matchHint",
                })}
          </span>
        </div>
      </div>
    </section>
  );
}
