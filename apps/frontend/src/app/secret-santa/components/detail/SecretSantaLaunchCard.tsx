import { Button } from "@/components/ui/Button/Button";
import { CircleDashed, Sparkles } from "lucide-react";
import styles from "./SecretSantaLaunchCard.module.scss";

type Props = {
  canLaunch: boolean;
  pendingInvitesCount: number;
  participantsCount: number;
  onLaunch?: () => void;
};

export function SecretSantaLaunchCard({
  canLaunch,
  pendingInvitesCount,
  participantsCount,
  onLaunch,
}: Props) {

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <CircleDashed size={16} />
        <span>Launch event</span>
      </div>

      <p>
        Generate receivers for every accepted participant.
      </p>

      <Button disabled={!canLaunch} onClick={onLaunch}>
        <Sparkles size={16} />
        <span>Launch Secret Santa</span>
      </Button>

    </section>
  );
}
