"use client";

import { useGT } from "gt-next";
import { Gift, Heart, MoreHorizontal, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
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

          <div className={styles.metaRow}>
            <div className={styles.meta}>
              {t("{count} members", {
                count: group.member_count,
                $id: "friends.groups.memberCount",
              })}
            </div>

            <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
              <DropdownMenu
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    className={`${styles.menuButton} iconTooltipTrigger`}
                    aria-label={t("Group actions", {
                      $id: "friends.groups.menuAria",
                    })}
                    data-tooltip={t("More options", {
                      $id: "itemCard.moreOptions",
                    })}
                    aria-expanded={open}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
                className={styles.menuDropdown}
              >
                <DropdownMenuItem variant="edit" onClick={() => onEdit(group)}>
                  <span>{t("Edit", { $id: "common.edit" })}</span>
                </DropdownMenuItem>
                <DropdownMenuItem variant="danger" onClick={() => onDelete(group)}>
                  <span>{t("Delete", { $id: "common.delete" })}</span>
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
