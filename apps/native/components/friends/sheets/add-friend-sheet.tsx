import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PeoplePickerField, type PeoplePickerItem } from "@/components/ui/people-picker";
import { Text } from "@/components/ui/text";
import { useSearchProfilesByNickname, useSendFriendRequest } from "@/hooks/use-friends";
import { useCurrentUserId } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

export function AddFriendSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { data: userId } = useCurrentUserId();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selected, setSelected] = React.useState<PeoplePickerItem[]>([]);
  const [copied, setCopied] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const searchParams = React.useMemo(() => ({ take: 10 }), []);
  const search = useSearchProfilesByNickname(debouncedQuery, searchParams);
  const sendRequest = useSendFriendRequest();
  const inviteLink = userId ? `wishlane://home?friendInvite=${userId}` : "";

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(timeout);
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setSelected([]);
      setCopied(false);
      setSuccess(false);
    }
  }, [open]);

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

  if (!open) return null;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function handleSelectionChange(profiles: PeoplePickerItem[]) {
    setSelected(profiles);
    setSuccess(false);
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleInvite() {
    if (selected.length === 0) return;

    await Promise.all(selected.map((profile) => sendRequest.mutateAsync(profile.id)));
    setSelected([]);
    setQuery("");
    setDebouncedQuery("");
    setSuccess(true);
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
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={() => onOpenChange(false)}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={sendRequest.isPending}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={selected.length === 0 || sendRequest.isPending}
            onPress={handleInvite}
          >
            {sendRequest.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{sendRequest.isPending ? t("Inviting...") : t("Invite")}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-5 px-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{t("Invite friends")}</Text>
          <Text className="text-sm text-text-muted">
            {t("Share your invite link or look up a friend by handle.")}
          </Text>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-sm font-bold text-text">{t("Your invite link")}</Text>
            {copied ? (
              <Text className="text-sm font-semibold text-success">{t("Copied")}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Copy invite link")}
            accessibilityState={{ disabled: !inviteLink }}
            disabled={!inviteLink}
            onPress={() => void handleCopy()}
            className={cn(
              "flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3 py-2 active:opacity-70 disabled:opacity-50",
              copied && "border-success",
            )}
          >
            <Text className="min-w-0 flex-1 text-sm text-text-muted" numberOfLines={1}>
              {inviteLink || "..."}
            </Text>
            <View className="size-10 items-center justify-center rounded-full">
              <Icon as={Copy} className={cn("size-4 text-text", copied && "text-success")} />
            </View>
          </Pressable>
        </View>

        <PeoplePickerField
          label={t("Or search")}
          title={t("Find friends")}
          addLabel={t("Search by handle")}
          items={results}
          selected={selected}
          onChange={handleSelectionChange}
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setSuccess(false);
          }}
          searchPlaceholder={t("username")}
          hint={searchHint}
          autoFocusSearch
          isLoading={isSearching}
          emptyLabel={t("No matches")}
        />

        {sendRequest.error ? (
          <Text className="text-sm font-semibold text-destructive">
            {sendRequest.error.message}
          </Text>
        ) : null}
        {success ? (
          <Text className="text-sm font-semibold text-success">{t("Invite sent!")}</Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}
