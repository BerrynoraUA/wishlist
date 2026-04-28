"use client";

import { useGT } from "gt-next";
import { Edit2, Gift, Heart, Star, Trash2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FriendGroup } from "@/api/types/friends";
import styles from "./FriendGroupCard.module.scss";

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  heart: Heart,
  star: Star,
  gift: Gift,
};

type Props = {
  group: FriendGroup;
  onEdit: (group: FriendGroup) => void;
  onDelete: (group: FriendGroup) => void;
};

export function FriendGroupCard({ group, onEdit, onDelete }: Props) {
  const t = useGT();
  const Icon = ICONS[group.icon] ?? Users;
  const colorClass = styles[group.color] ?? styles.pink;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.icon} ${colorClass}`}>
          <Icon size={20} />
        </div>

        <div className={styles.info}>
          <strong>{group.name}</strong>
          {group.description && <p className={styles.description}>{group.description}</p>}
          <div className={styles.meta}>
            {t("{count} members", {
              count: group.member_count,
              $id: "friends.groups.memberCount",
            })}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconButton} iconTooltipTrigger`}
          onClick={() => onEdit(group)}
          aria-label={t("Edit group", { $id: "friends.groups.editAria" })}
          data-tooltip={t("Edit group", { $id: "friends.groups.editTooltip" })}
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.danger} iconTooltipTrigger`}
          onClick={() => onDelete(group)}
          aria-label={t("Delete group", { $id: "friends.groups.deleteAria" })}
          data-tooltip={t("Delete group", {
            $id: "friends.groups.deleteTooltip",
          })}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}
