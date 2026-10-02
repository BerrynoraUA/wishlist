import { PeoplePickerSheet, type PeoplePickerItem } from "@/components/ui/people-picker";
import { useInfiniteFriends } from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useInviteSecretSantaUsers } from "@/hooks/use-secret-santa";
import { hapticSuccess } from "@/lib/haptics";
import { useGT } from "gt-react-native";
import * as React from "react";

const FRIENDS_PAGE_SIZE = 20;

/** Invite participants directly through the same picker used for friend invitations. */
export function SecretSantaInviteSheet({
  open,
  eventId,
  eventName,
  excludedUserIds,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  eventId: string;
  eventName: string;
  /** Users already participating or invited; hidden from the friend picker. */
  excludedUserIds: string[];
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}) {
  const t = useGT();
  const inviteUsers = useInviteSecretSantaUsers();
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const friendsQuery = useInfiniteFriends({ search: deferredQuery }, FRIENDS_PAGE_SIZE, {
    enabled: open,
  });
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const [selected, setSelected] = React.useState<PeoplePickerItem[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery("");
  }, [open]);

  const results = React.useMemo<PeoplePickerItem[]>(
    () =>
      friends
        .filter((friend) => !excludedUserIds.includes(friend.friend_id))
        .map((friend) => ({
          id: friend.friend_id,
          name: friend.display_name || friend.nickname || t("Friend"),
          subtitle: friend.nickname ? `@${friend.nickname}` : null,
          avatarUrl: friend.avatar_url,
        })),
    [excludedUserIds, friends, t],
  );

  async function handleInvite(profiles: PeoplePickerItem[]) {
    await inviteUsers.mutateAsync({
      eventId,
      eventName,
      userIds: profiles.map((friend) => friend.id),
    });
    hapticSuccess();
    onInvited?.();
  }

  if (!open) return null;

  return (
    <PeoplePickerSheet
      title={t("Invite friends")}
      onClose={() => onOpenChange(false)}
      confirmLabel={t("Invite")}
      onConfirm={handleInvite}
      items={results}
      selected={selected}
      onChange={setSelected}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t("Search friends")}
      isLoading={friendsQuery.isLoading}
      isError={friendsQuery.isError}
      isFetchingMore={friendsQuery.isFetchingNextPage}
      onEndReached={loadMoreFriends}
      emptyLabel={
        query.trim()
          ? t('No friends match "{search}".', { search: query.trim() })
          : t("No friends to invite.")
      }
    />
  );
}
