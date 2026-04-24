"use client";

import { useGT } from "gt-next";
import styles from "./FriendsHeader.module.scss";
import { Button } from "@/components/ui/Button/Button";

type Props = {
  onInvite: () => void;
};

export function FriendsHeader({ onInvite }: Props) {
  const t = useGT();
  return (
    <div className={styles.header}>
      <div>
        <h1>{t("Friends", { $id: "friends.header.title" })}</h1>
        <p>
          {t("Connect with friends and discover their wishlists.", {
            $id: "friends.header.subtitle",
          })}
        </p>
      </div>

      <Button onClick={onInvite}>{t("Invite Friends", { $id: "friends.header.invite" })}</Button>
    </div>
  );
}
