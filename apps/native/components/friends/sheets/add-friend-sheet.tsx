import { PeoplePickerSheet, type PeoplePickerItem } from "@/components/ui/people-picker";
import { useSearchProfilesByNickname, useSendFriendRequest } from "@/hooks/use-friends";
import { hapticSuccess } from "@/lib/haptics";
import { useGT } from "gt-react-native";
import * as React from "react";

/** The deep link that opens the app on a friend request from `userId`. */
export function getFriendInviteLink(userId: string) {
  return `wishlane://home?friendInvite=${userId}`;
}

/**
 * Search by handle and send friend requests — straight into the people picker, whose
 * confirm button sends the invites and closes it. Copying the invite link lives in the
 * create menu next to this, so there is no intermediate sheet.
 */
export function AddFriendSheet({ onClose }: { onClose: () => void }) {
  const t = useGT();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selected, setSelected] = React.useState<PeoplePickerItem[]>([]);
  const searchParams = React.useMemo(() => ({ take: 10 }), []);
  const search = useSearchProfilesByNickname(debouncedQuery, searchParams);
  const sendRequest = useSendFriendRequest();

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(timeout);
  }, [query]);

  const results = React.useMemo<PeoplePickerItem[]>(
    () =>
      (search.data ?? []).map((profile) => ({
        id: profile.id,
        name: profile.display_name || profile.nickname,
        subtitle: profile.display_name ? `@${profile.nickname}` : null,
        avatarUrl: profile.avatar_url,
      })),
    [search.data],
  );

  async function handleInvite(profiles: PeoplePickerItem[]) {
    await Promise.all(profiles.map((profile) => sendRequest.mutateAsync(profile.id)));
    hapticSuccess();
  }

  const trimmedQuery = query.trim();
  const searchHint = !trimmedQuery
    ? t("Search for someone by their handle.")
    : trimmedQuery.length < 3
      ? t("Type at least 3 characters.")
      : null;
  // The query only reaches the server after the debounce, so without this the picker
  // flashes "No matches" between the third keystroke and the request going out.
  const isSearching = trimmedQuery !== debouncedQuery || (search.isFetching && !search.data);

  return (
    <PeoplePickerSheet
      title={t("Find friends")}
      onClose={onClose}
      confirmLabel={t("Invite")}
      onConfirm={handleInvite}
      items={results}
      selected={selected}
      onChange={setSelected}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t("username")}
      hint={searchHint}
      autoFocusSearch
      isLoading={isSearching}
      emptyLabel={t("No matches")}
    />
  );
}
