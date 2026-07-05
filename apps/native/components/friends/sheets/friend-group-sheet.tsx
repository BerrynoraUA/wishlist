import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useFriendGroupMembers } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";
import type {
  FriendGroup,
  FriendGroupPayload,
  FriendWithDetails,
} from "@wishlist/backend/types/friends";
import { Check, Gift, Heart, Search, Star, Users, X, type LucideIcon } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

const COLOR_OPTIONS = ["pink", "peach", "blue", "lavender", "mint"] as const;
const ICON_OPTIONS: { value: string; icon: LucideIcon }[] = [
  { value: "users", icon: Users },
  { value: "heart", icon: Heart },
  { value: "star", icon: Star },
  { value: "gift", icon: Gift },
];

const COLOR_CLASS: Record<(typeof COLOR_OPTIONS)[number], string> = {
  pink: "bg-pink-400",
  peach: "bg-orange-400",
  blue: "bg-sky-400",
  lavender: "bg-violet-400",
  mint: "bg-emerald-400",
};

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

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[0.7, 1]}
      scrollable
      dismissOnBack={false}
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
          <Text className="text-sm font-bold text-text">{t("Description")}</Text>
          <Textarea
            value={description}
            onChangeText={setDescription}
            placeholder={t("Optional note")}
            className="min-h-16"
            numberOfLines={3}
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-bold text-text">{t("Color")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <Button
                key={option}
                size="icon"
                variant="ghost"
                accessibilityLabel={option}
                onPress={() => setColor(option)}
                className={cn("rounded-full", COLOR_CLASS[option])}
              >
                {color === option ? <Icon as={Check} className="size-4 text-white" /> : null}
              </Button>
            ))}
          </View>
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

        <View className="gap-2 rounded-xl border border-border-subtle bg-bg-subtle p-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-extrabold text-text">{t("Members")}</Text>
            <Text className="text-sm font-semibold text-text-muted">
              {t("{count} selected", { count: selectedIds.size })}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
            <Icon as={Search} className="size-4 text-text-muted" />
            <Input
              className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
              value={query}
              onChangeText={setQuery}
              placeholder={t("Search friends")}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t("Clear search")}
                onPress={() => setQuery("")}
                className="size-8 shrink-0 rounded-full"
              >
                <Icon as={X} className="size-3.5 text-text-muted" />
              </Button>
            ) : null}
          </View>
          {group && membersQuery.isLoading ? (
            <View className="items-center py-3">
              <ActivityIndicator colorClassName="accent-brand" />
            </View>
          ) : null}
          {friendOptions.length === 0 && !membersQuery.isLoading ? (
            <Text className="text-sm font-semibold text-text-muted">{t("No friends found.")}</Text>
          ) : null}
          <View className="gap-2">
            {friendOptions.map((friend) => {
              const active = selectedIds.has(friend.friend_id);
              const label = friend.nickname ? `@${friend.nickname}` : friend.display_name;
              return (
                <Button
                  key={friend.friend_id}
                  variant={active ? "default" : "outline"}
                  onPress={() => toggleMember(friend.friend_id)}
                  className="justify-start rounded-xl"
                >
                  <Text className={cn(active ? "text-primary-foreground" : "text-text")}>
                    {label}
                  </Text>
                  {active ? (
                    <Icon as={Check} className="ml-auto size-4 text-primary-foreground" />
                  ) : null}
                </Button>
              );
            })}
          </View>
        </View>

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
      </ScrollView>
    </BottomSheet>
  );
}
