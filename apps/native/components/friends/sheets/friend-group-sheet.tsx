import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  SlidingOptionSelector,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { useFriendGroupMembers } from "@/hooks/use-friends";
import { NATIVE_ACCENTS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type {
  FriendGroup,
  FriendGroupPayload,
  FriendWithDetails,
} from "@wishlist/backend/types/friends";
import { Gift, Heart, Search, Star, Users, X, type LucideIcon } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

// Ordered like the wishlist accent picker so the two read as the same control.
const COLOR_OPTIONS = ["pink", "blue", "peach", "mint", "lavender"] as const;

type GroupColor = (typeof COLOR_OPTIONS)[number];

const ICON_OPTIONS: { value: string; icon: LucideIcon }[] = [
  { value: "users", icon: Users },
  { value: "heart", icon: Heart },
  { value: "star", icon: Star },
  { value: "gift", icon: Gift },
];

/**
 * The same gradient swatches the wishlist accent picker uses. Group colours are named
 * after the very same five accents, so they should not drift into their own flat palette.
 */
const COLOR_CLASS = Object.fromEntries(
  NATIVE_ACCENTS.map((accent) => [accent.name, accent.swatchClassName]),
) as Record<GroupColor, string>;

export function FriendGroupSheet({
  open,
  group,
  friends,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  group: FriendGroup | null;
  friends: FriendWithDetails[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FriendGroupPayload) => Promise<void>;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const membersQuery = useFriendGroupMembers(group?.id);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState<(typeof COLOR_OPTIONS)[number]>("pink");
  const [icon, setIcon] = React.useState("users");
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setColor(COLOR_OPTIONS.find((option) => option === group?.color) ?? "pink");
    setIcon(group?.icon ?? "users");
    setQuery("");
    setSelectedIds(new Set());
    setError(null);
  }, [group, open]);

  React.useEffect(() => {
    if (!open || !group || !membersQuery.data) return;
    setSelectedIds(new Set(membersQuery.data.map((member) => member.id)));
  }, [group, membersQuery.data, open]);

  if (!open) return null;

  function toggleMember(friendId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setError(null);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || null,
        color,
        icon,
        memberIds: Array.from(selectedIds),
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to save group."));
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const friendOptions =
    normalizedQuery.length < 3
      ? friends
      : friends.filter((friend) => {
          const nickname = friend.nickname?.toLowerCase() ?? "";
          const displayName = friend.display_name?.toLowerCase() ?? "";
          return nickname.includes(normalizedQuery) || displayName.includes(normalizedQuery);
        });
  // Picked members move out of the list and into chips, matching the invite sheet. The
  // chips ignore the search box so a member never disappears while filtering.
  const unselectedFriends = friendOptions.filter((friend) => !selectedIds.has(friend.friend_id));
  const selectedFriends = friends.filter((friend) => selectedIds.has(friend.friend_id));

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
            disabled={isSaving}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={!name.trim() || isSaving}
            onPress={handleSubmit}
          >
            {isSaving ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{isSaving ? t("Saving...") : t("Save")}</Text>
          </Button>
        </View>
      }
    >
      <ScrollView
        className="max-h-full"
        contentContainerClassName="gap-3 px-5 pb-4 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1.5">
          <Text className="text-sm font-bold text-text">{t("Group name")}</Text>
          <Input
            className="h-10"
            value={name}
            onChangeText={setName}
            placeholder={t("Family, coworkers")}
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-bold text-text">{t("Description (optional)")}</Text>
          <Textarea
            value={description}
            onChangeText={setDescription}
            placeholder={t("Add a note about this group")}
            className="min-h-16"
            numberOfLines={3}
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-bold text-text">{t("Color")}</Text>
          <GroupColorSelector value={color} onChange={setColor} />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-bold text-text">{t("Icon")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {ICON_OPTIONS.map((option) => {
              const GroupIcon = option.icon;
              const selected = icon === option.value;
              return (
                <Button
                  key={option.value}
                  size="icon"
                  variant={selected ? "default" : "outline"}
                  accessibilityLabel={option.value}
                  onPress={() => setIcon(option.value)}
                  className="rounded-full"
                >
                  <Icon
                    as={GroupIcon}
                    className={cn("size-4", selected ? "text-primary-foreground" : "text-text")}
                  />
                </Button>
              );
            })}
          </View>
        </View>

        {/* Laid out exactly like the friend search in `AddFriendSheet`: a plain section,
            results above the field, no surrounding card. */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-extrabold uppercase text-text-muted">{t("Members")}</Text>
            <Text className="text-sm font-semibold text-text-muted">
              {t("{count} selected", { count: selectedIds.size })}
            </Text>
          </View>
          {group && membersQuery.isLoading ? (
            <View className="items-center py-3">
              <ActivityIndicator colorClassName="accent-brand" />
            </View>
          ) : unselectedFriends.length > 0 ? (
            <ScrollView
              className="max-h-56"
              contentContainerClassName="gap-2"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={unselectedFriends.length > 3}
            >
              {unselectedFriends.map((friend) => {
                const name = friend.display_name || friend.nickname || t("Friend");
                return (
                  <Button
                    key={friend.friend_id}
                    variant="outline"
                    onPress={() => toggleMember(friend.friend_id)}
                    className="h-auto justify-start gap-3 rounded-xl py-2"
                  >
                    <Avatar className="size-9" alt={name}>
                      {friend.avatar_url ? (
                        <AvatarImage source={{ uri: friend.avatar_url }} />
                      ) : null}
                      <AvatarFallback
                        className="bg-brand-lighter"
                        initialsClassName="text-sm text-brand"
                      />
                    </Avatar>
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-text" numberOfLines={1}>
                        {name}
                      </Text>
                      {friend.nickname ? (
                        <Text className="text-sm text-text-muted" numberOfLines={1}>
                          @{friend.nickname}
                        </Text>
                      ) : null}
                    </View>
                  </Button>
                );
              })}
            </ScrollView>
          ) : (
            <Text className="text-sm font-semibold text-text-muted">{t("No friends found.")}</Text>
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

          {selectedFriends.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {selectedFriends.map((friend) => {
                const name = friend.display_name || friend.nickname || t("Friend");
                return (
                  <Button
                    key={friend.friend_id}
                    variant="secondary"
                    size="sm"
                    accessibilityLabel={t("Remove {name}", { name })}
                    onPress={() => toggleMember(friend.friend_id)}
                    className="gap-2 rounded-full ps-1.5"
                  >
                    <Avatar className="size-6" alt={name}>
                      {friend.avatar_url ? (
                        <AvatarImage source={{ uri: friend.avatar_url }} />
                      ) : null}
                      <AvatarFallback
                        className="bg-brand-lighter"
                        initialsClassName="text-[10px] text-brand"
                      />
                    </Avatar>
                    <Text>{name}</Text>
                    <Icon as={X} className="size-3.5 text-text" />
                  </Button>
                );
              })}
            </View>
          ) : null}
        </View>

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
      </ScrollView>
    </BottomSheet>
  );
}

/**
 * Colour picker matching the wishlist accent selector: gradient swatch plus label on a
 * sliding indicator, rather than bare colour circles with a tick. Sharing the control
 * also removes the platform gap — the old round `Button`s rendered their fill and their
 * check very differently on iOS.
 */
function GroupColorSelector({
  value,
  onChange,
}: {
  value: GroupColor;
  onChange: (color: GroupColor) => void;
}) {
  const t = useGT();
  const rows = React.useMemo(() => {
    const labels: Record<GroupColor, string> = {
      pink: t("Pink"),
      blue: t("Blue"),
      peach: t("Peach"),
      mint: t("Mint"),
      lavender: t("Lavender"),
    };

    const options = COLOR_OPTIONS.map((option) => ({
      value: option,
      accessibilityLabel: t('Use "{label}" color', { label: labels[option] }),
      surfaceClassName: "bg-transparent",
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View className={cn("size-4 rounded-full", COLOR_CLASS[option])} />
          <Text
            className={cn("text-sm font-semibold text-text-muted", selected && "text-brand")}
            numberOfLines={1}
          >
            {labels[option]}
          </Text>
        </>
      ),
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, [t]);

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="gap-2 rounded-full px-3"
      indicatorClassName="rounded-full border border-brand bg-brand-lighter"
    />
  );
}
