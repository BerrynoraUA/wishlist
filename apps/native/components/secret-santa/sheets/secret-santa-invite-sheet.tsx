import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PeoplePickerField, type PeoplePickerItem } from "@/components/ui/people-picker";
import { Text } from "@/components/ui/text";
import { useFriends } from "@/hooks/use-friends";
import { useInviteSecretSantaUsers } from "@/hooks/use-secret-santa";
import { Copy, Share2 } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

const FRIENDS_PAGE_SIZE = 20;

/**
 * Deliberately mirrors `AddFriendSheet`: invite link on top, the shared people picker
 * below, one content-sized detent and no footer. The previous layout put the search in a
 * sheet footer with the results floating above it, which behaved differently per platform.
 */
export function SecretSantaInviteSheet({
  open,
  eventId,
  eventName,
  excludedUserIds,
  onOpenChange,
  onShareLink,
  onCopyLink,
  onInvited,
}: {
  open: boolean;
  eventId: string;
  eventName: string;
  /** Users already participating or invited; hidden from the friend picker. */
  excludedUserIds: string[];
  onOpenChange: (open: boolean) => void;
  onShareLink: () => void;
  onCopyLink: () => void;
  onInvited?: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const inviteUsers = useInviteSecretSantaUsers();
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const friendsQuery = useFriends({ take: FRIENDS_PAGE_SIZE, search: deferredQuery });
  const [selected, setSelected] = React.useState<PeoplePickerItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery("");
    setError(null);
  }, [open]);

  const results = React.useMemo<PeoplePickerItem[]>(
    () =>
      (friendsQuery.data ?? [])
        .filter((friend) => !excludedUserIds.includes(friend.friend_id))
        .map((friend) => ({
          id: friend.friend_id,
          name: friend.display_name || friend.nickname || t("Friend"),
          subtitle: friend.nickname ? `@${friend.nickname}` : null,
          avatarUrl: friend.avatar_url,
        })),
    [excludedUserIds, friendsQuery.data, t],
  );

  if (!open) return null;

  function closeSheet() {
    void sheetRef.current?.dismiss();
  }

  function handleShareLink() {
    closeSheet();
    onShareLink();
  }

  function handleCopyLink() {
    closeSheet();
    onCopyLink();
  }

  function submit() {
    if (selected.length === 0) return;

    inviteUsers.mutate(
      { eventId, eventName, userIds: selected.map((friend) => friend.id) },
      {
        onSuccess: () => {
          onInvited?.();
          closeSheet();
        },
        onError: (mutationError) => setError(mutationError.message),
      },
    );
  }

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={() => onOpenChange(false)}>
      <View className="gap-5 px-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{t("Invite friends")}</Text>
          <Text className="text-sm text-text-muted">
            {t("Share the invite link or pick someone from your friends.")}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-bold text-text">{t("Invite link")}</Text>
          <View className="flex-row items-center rounded-full border border-border-subtle bg-card-bg px-2">
            <Button
              className="h-11 min-w-0 flex-1 justify-start px-2"
              variant="ghost"
              onPress={handleShareLink}
            >
              <Icon as={Share2} className="size-5 text-text" />
              <Text className="text-base">{t("Share invite link")}</Text>
            </Button>
            <View className="h-6 w-px bg-border-subtle" />
            <Button
              variant="ghost"
              size="icon-lg"
              accessibilityLabel={t("Copy invite link")}
              onPress={handleCopyLink}
            >
              <Icon as={Copy} className="size-5 text-text" />
            </Button>
          </View>
        </View>

        <PeoplePickerField
          label={t("Or search")}
          title={t("Invite friends")}
          addLabel={t("Choose friends")}
          items={results}
          selected={selected}
          onChange={setSelected}
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t("Search friends")}
          isLoading={friendsQuery.isLoading}
          emptyLabel={
            query.trim()
              ? t('No friends match "{search}".', { search: query.trim() })
              : t("No friends to invite.")
          }
        />

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}

        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={inviteUsers.isPending}
            onPress={closeSheet}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={selected.length === 0 || inviteUsers.isPending}
            onPress={submit}
          >
            {inviteUsers.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{inviteUsers.isPending ? t("Inviting...") : t("Invite")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
