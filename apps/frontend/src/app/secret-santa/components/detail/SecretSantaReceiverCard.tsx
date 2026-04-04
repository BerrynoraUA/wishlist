import type { SecretSantaPerson } from "@/api/types/secret-santa";
import { Sparkles } from "lucide-react";
import { SecretSantaPersonAvatar } from "./SecretSantaPersonAvatar";
import styles from "./SecretSantaReceiverCard.module.scss";

type Props = {
  receiver: SecretSantaPerson;
};

export function SecretSantaReceiverCard({ receiver }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <Sparkles size={16} />
        <span>Your receiver</span>
      </div>

      <div className={styles.body}>
        <SecretSantaPersonAvatar person={receiver} size="md" />
        <div className={styles.meta}>
          <strong>
            {receiver.display_name ?? receiver.nickname ?? "Assigned person"}
          </strong>
          <span>
            {receiver.nickname
              ? `@${receiver.nickname}`
              : "Your Secret Santa match"}
          </span>
        </div>
      </div>
    </section>
  );
}
