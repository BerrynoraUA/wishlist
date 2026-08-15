import { useGT } from "gt-next";
import { Button } from "@/components/ui/Button/Button";
import styles from "./RequestCard.module.scss";
import type { FriendRequestWithDetails } from "@/api/types/friends";

type Props = {
  request: FriendRequestWithDetails;
  onAccept: () => void;
  onReject: () => void;
  onBlock?: () => void;
  accepting?: boolean;
  rejecting?: boolean;
  blocking?: boolean;
};

export function RequestCard({
  request,
  onAccept,
  onReject,
  onBlock,
  accepting = false,
  rejecting = false,
  blocking = false,
}: Props) {
  const t = useGT();

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>👤</div>

      <div className={styles.info}>
        <strong>{request.display_name}</strong>
        {request.nickname && <span>@{request.nickname}</span>}
        <div className={styles.meta}>
          {t("{mutualCount} mutual friends", {
            mutualCount: request.mutual_friends_count,
            $id: "friends.requestCard.meta",
          })}
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          size="sm"
          className={styles.accept}
          onClick={onAccept}
          disabled={accepting || rejecting}
        >
          {accepting
            ? t("Accepting...", { $id: "friends.requestCard.accepting" })
            : t("Accept", { $id: "friends.requestCard.accept" })}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={styles.decline}
          onClick={onReject}
          disabled={accepting || rejecting}
        >
          {rejecting
            ? t("Declining...", { $id: "friends.requestCard.declining" })
            : t("Decline", { $id: "friends.requestCard.decline" })}
        </Button>
        {onBlock && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBlock}
            disabled={accepting || rejecting || blocking}
          >
            {t("Block", { $id: "friends.requestCard.block" })}
          </Button>
        )}
      </div>
    </div>
  );
}
