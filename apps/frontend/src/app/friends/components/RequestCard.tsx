import styles from "./RequestCard.module.scss";
import type { FriendRequestWithDetails } from "@/api/types/friends";

type Props = {
  request: FriendRequestWithDetails;
  onAccept: () => void;
  onReject: () => void;
  accepting?: boolean;
  rejecting?: boolean;
};

export function RequestCard({
  request,
  onAccept,
  onReject,
  accepting = false,
  rejecting = false,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.avatar}>👤</div>

      <div className={styles.info}>
        <strong>{request.display_name}</strong>
        {request.nickname && <span>@{request.nickname}</span>}
        <div className={styles.meta}>
          {request.mutual_friends_count} mutual friends
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.accept}
          onClick={onAccept}
          disabled={accepting || rejecting}
        >
          {accepting ? "Accepting..." : "Accept"}
        </button>
        <button
          className={styles.decline}
          onClick={onReject}
          disabled={accepting || rejecting}
        >
          {rejecting ? "Declining..." : "Decline"}
        </button>
      </div>
    </div>
  );
}
