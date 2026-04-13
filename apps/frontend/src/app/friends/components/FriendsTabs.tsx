"use client";

import { useGT } from "gt-next";
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
  const t = useGT();
  return (
    <div className={styles.tabs}>
      <button
        className={active === "friends" ? styles.active : ""}
        onClick={() => onChange("friends")}
      >
        {t("Friends", { $id: "friends.tabs.friends" })} <span>{friendsCount}</span>
      </button>

      <button
        className={active === "requests" ? styles.active : ""}
        onClick={() => onChange("requests")}
      >
        {t("Requests", { $id: "friends.tabs.requests" })}{" "}
        <span className={styles.badge}>{requestsCount}</span>
      </button>

      <button className={active === "sent" ? styles.active : ""} onClick={() => onChange("sent")}>
        {t("Sent", { $id: "friends.tabs.sent" })} <span>{sentCount}</span>
      </button>
    </div>
  );
}
