import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useFriends } from "@/hooks/use-friends";
import { useInviteSecretSantaUsers } from "@/hooks/use-secret-santa";
import { Copy, Share2, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

const FRIENDS_PAGE_SIZE = 10;

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
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [take, setTake] = React.useState(FRIENDS_PAGE_SIZE);
  const friendsQuery = useFriends({ take, search: deferredSearch });
  const [selected, setSelected] = React.useState<AutocompleteDropdownOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setSearch("");
    setTake(FRIENDS_PAGE_SIZE);
    setError(null);
  }, [open]);

  const friendOptions = React.useMemo<AutocompleteDropdownOption[]>(() => {
    return (friendsQuery.data ?? [])
      .filter((friend) => !excludedUserIds.includes(friend.friend_id))
      .map((friend) => ({
        value: friend.friend_id,
        label: friend.display_name || friend.nickname || t("Friend"),
        description: friend.nickname ? `@${friend.nickname}` : undefined,
        keywords: [friend.display_name, friend.nickname].filter(Boolean) as string[],
        imageUrl: friend.avatar_url,
      }));
  }, [friendsQuery.data, excludedUserIds, t]);

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
      { eventId, eventName, userIds: selected.map((option) => option.value) },
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
    <BottomSheet
      ref={sheetRef}
      scrollable
      onDidDismiss={() => onOpenChange(false)}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={inviteUsers.isPending}
            onPress={closeSheet}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={inviteUsers.isPending || selected.length === 0}
            onPress={submit}
          >
            {inviteUsers.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{inviteUsers.isPending ? t("Sending...") : t("Send invites")}</Text>
          </Button>
        </View>
      }
    >
      <ScrollView
        className="max-h-full"
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="text-xl font-extrabold text-text">{t("Invite friends")}</Text>
          <Text className="text-sm leading-5 text-text-muted">
            {t("Share the link with anyone, or invite friends directly.")}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Button className="min-w-0 flex-1" variant="outline" onPress={handleShareLink}>
            <Icon as={Share2} className="size-4 text-text" />
            <Text>{t("Share invite link")}</Text>
          </Button>
          <Button
            variant="outline"
            size="icon"
            accessibilityLabel={t("Copy invite link")}
            onPress={handleCopyLink}
          >
            <Icon as={Copy} className="size-4 text-text" />
          </Button>
        </View>

        <View className="gap-2">
          <View className="gap-1">
            <Text className="font-bold text-text">{t("Invite friends directly")}</Text>
            <Text className="text-sm text-text-muted">
              {t("Search by name or username, then choose one or more friends.")}
            </Text>
          </View>
          {selected.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 pt-1">
              {selected.map((friend) => (
                <Button
                  key={friend.value}
                  variant="secondary"
                  size="sm"
                  accessibilityLabel={t("Remove {name}", { name: friend.label })}
                  onPress={() =>
                    setSelected((current) => current.filter((item) => item.value !== friend.value))
                  }
                  className="rounded-full"
                >
                  <Text>{friend.label}</Text>
                  <Icon as={X} className="size-3.5 text-text" />
                </Button>
              ))}
            </View>
          ) : null}
          <AutocompleteDropdown
            multiple
            attached
            alwaysShowOptions
            options={friendOptions}
            value={selected}
            onValueChange={setSelected}
            onQueryChange={(query) => {
              setSearch(query);
              setTake(FRIENDS_PAGE_SIZE);
            }}
            onEndReached={() => {
              if (!friendsQuery.isFetching && (friendsQuery.data?.length ?? 0) >= take) {
                setTake((current) => current + FRIENDS_PAGE_SIZE);
              }
            }}
            isLoading={friendsQuery.isLoading}
            isLoadingMore={friendsQuery.isFetching && take > FRIENDS_PAGE_SIZE}
            maxVisibleOptions={4}
            closeAccessibilityLabel={t("Close friend search")}
            hideSelectedOptions
            showSelectedValue={false}
            placeholder={t("Search friends")}
            emptyText={
              search.trim()
                ? t('No friends match "{search}".', { search: search.trim() })
                : t("No friends to invite.")
            }
            inputProps={{ autoCapitalize: "words", autoCorrect: false }}
          />
        </View>

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
      </ScrollView>
    </BottomSheet>
  );
}
