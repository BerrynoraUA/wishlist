"use client";

import styles from "./FriendsTabs.module.scss";

type TabValue = "friends" | "requests" | "sent";

type Props = {
  active: TabValue;
  friendsCount: number;
  requestsCount: number;
  sentCount?: number;
  onChange: (v: TabValue) => void;
};

export function FriendsTabs({
  active,
  friendsCount,
  requestsCount,
  sentCount = 0,
  onChange,
}: Props) {
  return (
    <div className={styles.tabs}>
      <button
        className={active === "friends" ? styles.active : ""}
        onClick={() => onChange("friends")}
      >
        All Friends <span>{friendsCount}</span>
      </button>

      <button
        className={active === "requests" ? styles.active : ""}
        onClick={() => onChange("requests")}
      >
        Requests <span className={styles.badge}>{requestsCount}</span>
      </button>

      <button
        className={active === "sent" ? styles.active : ""}
        onClick={() => onChange("sent")}
      >
        Sent <span>{sentCount}</span>
      </button>
    </div>
  );
}
