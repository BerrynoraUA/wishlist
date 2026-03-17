import styles from "./OutgoingRequestCard.module.scss";
import type { FriendRequestWithDetails } from "@/api/types/friends";

type Props = {
  request: FriendRequestWithDetails;
  onCancel: () => void;
  cancelling?: boolean;
};

export function OutgoingRequestCard({
  request,
  onCancel,
  cancelling = false,
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
          className={styles.cancel}
          onClick={onCancel}
          disabled={cancelling}
        >
          {cancelling ? "Cancelling..." : "Cancel Request"}
        </button>
      </div>
    </div>
  );
}
