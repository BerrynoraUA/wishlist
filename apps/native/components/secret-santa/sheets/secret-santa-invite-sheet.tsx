import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useFriends } from "@/hooks/use-friends";
import { useInviteSecretSantaUsers } from "@/hooks/use-secret-santa";
import { Copy, Search, Share2, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

const FRIENDS_PAGE_SIZE = 20;

type InviteFriend = {
  id: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
};

/**
 * Deliberately mirrors `AddFriendSheet`: invite link on top, search below, one
 * content-sized detent and no footer. The previous layout put the search in a sheet
 * footer with the results floating above it, which behaved differently on each platform.
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
  const [selected, setSelected] = React.useState<InviteFriend[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery("");
    setError(null);
  }, [open]);

  const results = React.useMemo<InviteFriend[]>(() => {
    const selectedIds = new Set(selected.map((friend) => friend.id));

    return (friendsQuery.data ?? [])
      .filter(
        (friend) =>
          !excludedUserIds.includes(friend.friend_id) && !selectedIds.has(friend.friend_id),
      )
      .map((friend) => ({
        id: friend.friend_id,
        name: friend.display_name || friend.nickname || t("Friend"),
        nickname: friend.nickname,
        avatarUrl: friend.avatar_url,
      }));
  }, [excludedUserIds, friendsQuery.data, selected, t]);

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
      <View className="gap-5 px-5 pb-5 pt-5">
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

        <View className="gap-3">
          <Text className="text-xs font-extrabold uppercase text-text-muted">{t("Or search")}</Text>

          {friendsQuery.isLoading ? (
            <View className="items-center py-3">
              <ActivityIndicator colorClassName="accent-brand" />
            </View>
          ) : results.length > 0 ? (
            <ScrollView
              className="max-h-56"
              contentContainerClassName="gap-2"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={results.length > 3}
            >
              {results.map((friend) => (
                <Button
                  key={friend.id}
                  variant="outline"
                  onPress={() => setSelected((current) => [...current, friend])}
                  className="h-auto justify-start gap-3 rounded-xl py-2"
                >
                  <Avatar className="size-9" alt={friend.name}>
                    {friend.avatarUrl ? <AvatarImage source={{ uri: friend.avatarUrl }} /> : null}
                    <AvatarFallback
                      className="bg-brand-lighter"
                      initialsClassName="text-sm text-brand"
                    />
                  </Avatar>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-text" numberOfLines={1}>
                      {friend.name}
                    </Text>
                    {friend.nickname ? (
                      <Text className="text-sm text-text-muted" numberOfLines={1}>
                        @{friend.nickname}
                      </Text>
                    ) : null}
                  </View>
                </Button>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-sm font-semibold text-text-muted">
              {query.trim()
                ? t('No friends match "{search}".', { search: query.trim() })
                : t("No friends to invite.")}
            </Text>
          )}

          <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
            <Icon as={Search} className="size-4 text-muted-foreground/50" />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t("Search friends")}
              autoCapitalize="none"
              // Looks up other people, so no autofill — and no yellow overlay for it.
              autoComplete="off"
              importantForAutofill="no"
              className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t("Clear search")}
                onPress={() => setQuery("")}
                className="size-9 shrink-0 rounded-full"
              >
                <Icon as={X} className="size-4 text-destructive" />
              </Button>
            ) : null}
          </View>

          {selected.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {selected.map((friend) => (
                <Button
                  key={friend.id}
                  variant="secondary"
                  size="sm"
                  accessibilityLabel={t("Remove {name}", { name: friend.name })}
                  onPress={() =>
                    setSelected((current) => current.filter((item) => item.id !== friend.id))
                  }
                  className="gap-2 rounded-full ps-1.5"
                >
                  <Avatar className="size-6" alt={friend.name}>
                    {friend.avatarUrl ? <AvatarImage source={{ uri: friend.avatarUrl }} /> : null}
                    <AvatarFallback
                      className="bg-brand-lighter"
                      initialsClassName="text-[10px] text-brand"
                    />
                  </Avatar>
                  <Text>{friend.name}</Text>
                  <Icon as={X} className="size-3.5 text-text" />
                </Button>
              ))}
            </View>
          ) : null}
        </View>

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
