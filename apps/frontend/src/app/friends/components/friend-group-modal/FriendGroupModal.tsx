"use client";

import { useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Check, Gift, Heart, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import type { FriendGroup, FriendGroupPayload, FriendWithDetails } from "@/api/types/friends";
import { useFriendGroupMembers } from "@/hooks/use-friends";
import styles from "./FriendGroupModal.module.scss";

const COLOR_OPTIONS = ["pink", "peach", "blue", "lavender", "mint"] as const;
const ICON_OPTIONS: { value: string; icon: LucideIcon }[] = [
  { value: "users", icon: Users },
  { value: "heart", icon: Heart },
  { value: "star", icon: Star },
  { value: "gift", icon: Gift },
];

type Props = {
  open: boolean;
  group: FriendGroup | null;
  friends: FriendWithDetails[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: FriendGroupPayload) => Promise<void>;
};

export function FriendGroupModal({ open, group, friends, isSaving, onClose, onSubmit }: Props) {
  const t = useGT();
  const editing = Boolean(group);
  const { data: members = [], isLoading: membersLoading } = useFriendGroupMembers(group?.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>("pink");
  const [icon, setIcon] = useState("users");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setColor((group?.color as (typeof COLOR_OPTIONS)[number]) ?? "pink");
    setIcon(group?.icon ?? "users");
    setQuery("");
    setSelectedIds(new Set());
  }, [group, open]);

  useEffect(() => {
    if (!open || !group) return;
    setSelectedIds(new Set(members.map((member) => member.id)));
  }, [group, members, open]);

  const friendOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 3) return friends;
    return friends.filter((friend) => {
      const nickname = friend.nickname?.toLowerCase() ?? "";
      const displayName = friend.display_name?.toLowerCase() ?? "";
      return nickname.includes(normalizedQuery) || displayName.includes(normalizedQuery);
    });
  }, [friends, query]);

  function toggleMember(friendId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }

  async function handleSubmit() {
    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon,
      memberIds: Array.from(selectedIds),
    });
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Heading>
            {editing
              ? t("Edit group", { $id: "friends.groups.modal.editTitle" })
              : t("Create group", { $id: "friends.groups.modal.createTitle" })}
          </Heading>
          <Text variant="caption" tone="muted">
            {t("Group your friends for faster wishlist sharing.", {
              $id: "friends.groups.modal.subtitle",
            })}
          </Text>
        </div>

        <div className={styles.field}>
          <label>{t("Group name", { $id: "friends.groups.modal.name" })}</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("Family, coworkers, close friends", {
              $id: "friends.groups.modal.namePlaceholder",
            })}
          />
        </div>

        <div className={styles.field}>
          <label>
            {t("Description (optional)", {
              $id: "friends.groups.modal.description",
            })}
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("Add details, size, color...", {
              $id: "friends.groups.modal.descriptionPlaceholder",
            })}
          />
        </div>

        <div className={styles.field}>
          <label>{t("Color", { $id: "friends.groups.modal.color" })}</label>
          <div className={styles.options}>
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.swatch} ${styles[option]} ${color === option ? styles.selected : ""}`}
                onClick={() => setColor(option)}
                aria-label={option}
              >
                {color === option && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>{t("Icon", { $id: "friends.groups.modal.icon" })}</label>
          <div className={styles.options}>
            {ICON_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.iconOption} ${icon === option.value ? styles.selected : ""}`}
                  onClick={() => setIcon(option.value)}
                  aria-label={option.value}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.membersPanel}>
          <div className={styles.membersHeader}>
            <strong>{t("Members", { $id: "friends.groups.modal.members" })}</strong>
            <span>
              {t("{count} selected", {
                count: selectedIds.size,
                $id: "friends.groups.modal.selectedCount",
              })}
            </span>
          </div>
          <input
            className={styles.memberSearch}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search friends", {
              $id: "friends.groups.modal.searchFriends",
            })}
          />
          <div className={styles.memberList}>
            {group && membersLoading && (
              <div className={styles.empty}>
                {t("Loading members...", {
                  $id: "friends.groups.modal.loadingMembers",
                })}
              </div>
            )}
            {!membersLoading && friendOptions.length === 0 && (
              <div className={styles.empty}>
                {t("No friends found.", {
                  $id: "friends.groups.modal.noFriends",
                })}
              </div>
            )}
            {!membersLoading &&
              friendOptions.map((friend) => {
                const active = selectedIds.has(friend.friend_id);
                const label = friend.nickname ? `@${friend.nickname}` : friend.display_name;
                return (
                  <button
                    key={friend.friend_id}
                    type="button"
                    className={`${styles.memberButton} ${active ? styles.memberSelected : ""}`}
                    onClick={() => toggleMember(friend.friend_id)}
                  >
                    <span className={styles.avatar}>
                      {(friend.nickname ?? friend.display_name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className={styles.memberName}>{label}</span>
                    {active && <Check size={15} />}
                  </button>
                );
              })}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSaving}>
            {isSaving
              ? t("Saving...", { $id: "common.saving" })
              : t("Save", { $id: "common.save" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
