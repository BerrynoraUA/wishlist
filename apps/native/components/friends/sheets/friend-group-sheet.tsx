import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PeoplePickerField, type PeoplePickerItem } from "@/components/ui/people-picker";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  SlidingOptionSelector,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { useFriendGroupMembers, useInfiniteFriends } from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { FRIEND_GROUP_ICON_OPTIONS } from "@/lib/friend-groups";
import { NATIVE_ACCENTS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { FriendGroup, FriendGroupPayload } from "@wishlist/backend/types/friends";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

// Ordered like the wishlist accent picker so the two read as the same control.
const COLOR_OPTIONS = ["pink", "blue", "peach", "mint", "lavender"] as const;
const FRIENDS_PAGE_SIZE = 20;

type GroupColor = (typeof COLOR_OPTIONS)[number];

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
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  group: FriendGroup | null;
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
  const deferredQuery = React.useDeferredValue(query);
  const friendsQuery = useInfiniteFriends({ search: deferredQuery }, FRIENDS_PAGE_SIZE, {
    enabled: open,
  });
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const [members, setMembers] = React.useState<PeoplePickerItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setColor(COLOR_OPTIONS.find((option) => option === group?.color) ?? "pink");
    setIcon(group?.icon ?? "users");
    setQuery("");
    setMembers([]);
    setError(null);
  }, [group, open]);

  React.useEffect(() => {
    if (!open || !group || !membersQuery.data) return;
    setMembers(
      membersQuery.data.map((member) => ({
        id: member.id,
        name: member.display_name || member.nickname || t("Friend"),
        subtitle: member.nickname ? `@${member.nickname}` : null,
        avatarUrl: member.avatar_url,
      })),
    );
  }, [group, membersQuery.data, open, t]);

  const friendItems = React.useMemo<PeoplePickerItem[]>(
    () =>
      friends.map((friend) => ({
        id: friend.friend_id,
        name: friend.display_name || friend.nickname || t("Friend"),
        subtitle: friend.nickname ? `@${friend.nickname}` : null,
        searchText: friend.nickname,
        avatarUrl: friend.avatar_url,
      })),
    [friends, t],
  );

  if (!open) return null;

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
        memberIds: members.map((member) => member.id),
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to save group."));
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable={Boolean(group)}
      detents={group ? undefined : ["auto"]}
      footerInsetMode="scroll-content"
      onDidDismiss={() => onOpenChange(false)}
      header={<BottomSheetHeader title={group ? t("Edit group") : t("Create a group")} />}
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
      <BottomSheetScrollView
        className="max-h-full"
        contentContainerClassName="gap-3 px-5"
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
          <GroupIconSelector value={icon} onChange={setIcon} />
        </View>

        <PeoplePickerField
          label={t("Members")}
          title={t("Add members")}
          addLabel={t("Add members")}
          items={friendItems}
          selected={members}
          onChange={setMembers}
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t("Search friends")}
          emptyLabel={t("No friends found.")}
          isLoading={friendsQuery.isLoading || (Boolean(group) && membersQuery.isLoading)}
          isError={friendsQuery.isError || membersQuery.isError}
          isFetchingMore={friendsQuery.isFetchingNextPage}
          onEndReached={loadMoreFriends}
        />

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function GroupIconSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const rows = React.useMemo(
    () => [
      FRIEND_GROUP_ICON_OPTIONS.map((option) => {
        const GroupIcon = option.icon;

        return {
          value: option.value,
          accessibilityLabel: option.value,
          surfaceClassName: "bg-transparent",
          children: ({ selected }: SlidingOptionRenderProps) => (
            <Icon as={GroupIcon} className={cn("size-4 text-text", selected && "text-brand")} />
          ),
        };
      }),
    ],
    [],
  );

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="rounded-full px-0"
      indicatorClassName="rounded-full border border-brand bg-brand-lighter"
    />
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
