"use client";

import type { DiscoverSection as Section } from "@/api/types/wishilst";
import { DiscoverSection } from "../discover-section/DiscoverSection";

type Props = {
  sections: Section[];
  nicknameToFriendId: Map<string, string>;
  avatarById: Map<string, string | null>;
  onToggleReserve: (itemId: string) => void;
  onToggleBought: (itemId: string) => void;
};

/**
 * Renders the list of discover sections and handles the friend-id/avatar
 * lookup so the parent page doesn't have to thread `Map.get()` chains into
 * JSX props.
 */
export function DiscoverSectionList({
  sections,
  nicknameToFriendId,
  avatarById,
  onToggleReserve,
  onToggleBought,
}: Props) {
  return (
    <>
      {sections.map((section) => {
        const friendId = section.friend_id ?? nicknameToFriendId.get(section.username) ?? null;
        const avatarUrl =
          section.avatar_url ?? (friendId ? (avatarById.get(friendId) ?? null) : null);

        return (
          <DiscoverSection
            key={section.id}
            {...section}
            friend_id={friendId ?? undefined}
            avatarUrl={avatarUrl}
            showDiscountBadge
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
          />
        );
      })}
    </>
  );
}
