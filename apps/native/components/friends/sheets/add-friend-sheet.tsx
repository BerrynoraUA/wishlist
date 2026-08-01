import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSearchProfilesByNickname, useSendFriendRequest } from "@/hooks/use-friends";
import { useCurrentUserId } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import type { ProfileSearchResult } from "@wishlist/backend/types/friends";
import * as Clipboard from "expo-clipboard";
import { Copy, Search, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

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
  const [selected, setSelected] = React.useState<ProfileSearchResult[]>([]);
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

  if (!open) return null;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function handleSelect(profile: ProfileSearchResult) {
    setSelected((current) =>
      current.some((item) => item.id === profile.id) ? current : [...current, profile],
    );
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

  const results = search.data ?? [];
  const visibleResults = React.useMemo(
    () => results.filter((profile) => !selected.some((item) => item.id === profile.id)),
    [results, selected],
  );
  const canSearch = debouncedQuery.length >= 3;

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={() => onOpenChange(false)}>
      <View className="gap-5 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{t("Invite friends")}</Text>
          <Text className="text-sm text-text-muted">
            {t("Share your invite link or look up a friend by handle.")}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-bold text-text">{t("Your invite link")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Copy invite link")}
            accessibilityState={{ disabled: !inviteLink }}
            disabled={!inviteLink}
            onPress={() => void handleCopy()}
            className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3 py-2 active:opacity-70 disabled:opacity-50"
          >
            <Text className="min-w-0 flex-1 text-sm text-text-muted" numberOfLines={1}>
              {inviteLink || "..."}
            </Text>
            <View className="size-10 items-center justify-center rounded-full">
              <Icon as={Copy} className="size-4 text-text" />
            </View>
          </Pressable>
          {copied ? (
            <Text className="text-sm font-semibold text-success">{t("Copied")}</Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Text className="text-xs font-extrabold uppercase text-text-muted">{t("Or search")}</Text>
          {query.trim().length > 0 ? (
            canSearch ? (
              <ScrollView
                className="max-h-56"
                contentContainerClassName="gap-2"
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={visibleResults.length > 3}
              >
                {search.isFetching && visibleResults.length === 0 ? (
                  <View className="items-center py-3">
                    <ActivityIndicator colorClassName="accent-brand" />
                  </View>
                ) : null}
                {!search.isFetching && visibleResults.length === 0 ? (
                  <Text className="text-sm font-semibold text-text-muted">{t("No matches")}</Text>
                ) : null}
                {visibleResults.map((profile) => (
                  <Button
                    key={profile.id}
                    variant="outline"
                    onPress={() => handleSelect(profile)}
                    className="h-auto justify-start gap-3 rounded-xl py-2"
                  >
                    <Avatar
                      className="size-9"
                      alt={profile.display_name || profile.nickname || t("Friend")}
                    >
                      {profile.avatar_url ? (
                        <AvatarImage source={{ uri: profile.avatar_url }} />
                      ) : null}
                      <AvatarFallback
                        className="bg-brand-lighter"
                        initialsClassName="text-sm text-brand"
                      />
                    </Avatar>
                    <View className="min-w-0 flex-1">
                      {profile.display_name ? (
                        <Text className="font-bold text-text" numberOfLines={1}>
                          {profile.display_name}
                        </Text>
                      ) : null}
                      <Text
                        className={cn(
                          "text-text-muted",
                          profile.display_name ? "text-sm" : "font-bold text-text",
                        )}
                        numberOfLines={1}
                      >
                        @{profile.nickname}
                      </Text>
                    </View>
                  </Button>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-sm text-text-muted">{t("Type at least 3 characters.")}</Text>
            )
          ) : null}

          <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
            <Icon as={Search} className="size-4 text-muted-foreground/50" />
            <Input
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setSuccess(false);
              }}
              placeholder={t("username")}
              autoCapitalize="none"
              className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t("Clear search")}
                onPress={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  setSuccess(false);
                }}
                className="size-9 shrink-0 rounded-full"
              >
                <Icon as={X} className="size-4 text-text-muted" />
              </Button>
            ) : null}
          </View>

          {selected.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {selected.map((profile) => (
                <Button
                  key={profile.id}
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    setSelected((current) => current.filter((item) => item.id !== profile.id))
                  }
                  className="gap-2 rounded-full ps-1.5"
                >
                  <Avatar
                    className="size-6"
                    alt={profile.display_name || profile.nickname || t("Friend")}
                  >
                    {profile.avatar_url ? (
                      <AvatarImage source={{ uri: profile.avatar_url }} />
                    ) : null}
                    <AvatarFallback
                      className="bg-brand-lighter"
                      initialsClassName="text-[10px] text-brand"
                    />
                  </Avatar>
                  <Text>@{profile.nickname}</Text>
                  <Icon as={X} className="size-3.5 text-text" />
                </Button>
              ))}
            </View>
          ) : null}
        </View>

        {sendRequest.error ? (
          <Text className="text-sm font-semibold text-destructive">
            {sendRequest.error.message}
          </Text>
        ) : null}
        {success ? (
          <Text className="text-sm font-semibold text-success">{t("Invite sent!")}</Text>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={sendRequest.isPending}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={selected.length === 0 || sendRequest.isPending}
            onPress={handleInvite}
          >
            {sendRequest.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{sendRequest.isPending ? t("Inviting...") : t("Invite")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
