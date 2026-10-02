import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  type BottomSheetRef,
  useSheetContentDetent,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useFriendGroupMembers } from "@/hooks/use-friends";
import type { FriendGroup } from "@wishlist/backend/types/friends";
import { ChevronRight, Pencil } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Pressable, View } from "react-native";

/** Read-only view of a friend group: who is in it, with a way into each member's profile. */
export function FriendGroupDetailsSheet({
  group,
  onClose,
  onEdit,
  onOpenMember,
}: {
  group: FriendGroup;
  onClose: () => void;
  onEdit: (group: FriendGroup) => void;
  onOpenMember: (userId: string) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { detent, onContentSizeChange, onHeaderLayout } = useSheetContentDetent();
  const membersQuery = useFriendGroupMembers(group.id);
  const members = membersQuery.data ?? [];
  // Runs once the sheet is gone, so a follow-up screen or sheet never fights the dismissal.
  const afterDismissRef = React.useRef<(() => void) | null>(null);

  function dismissThen(action: () => void) {
    afterDismissRef.current = action;
    void sheetRef.current?.dismiss();
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      detents={[detent]}
      footerInsetMode="scroll-content"
      onDidDismiss={() => {
        onClose();
        afterDismissRef.current?.();
        afterDismissRef.current = null;
      }}
      header={
        <View onLayout={onHeaderLayout}>
          <BottomSheetHeader title={group.name} />
        </View>
      }
      footer={
        <View className="w-full border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button variant="outline" onPress={() => dismissThen(() => onEdit(group))}>
            <Icon as={Pencil} className="size-4 text-text" />
            <Text>{t("Edit group")}</Text>
          </Button>
        </View>
      }
    >
      <BottomSheetScrollView
        className="max-h-full"
        contentContainerClassName="gap-4 px-5"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={onContentSizeChange}
      >
        {group.description ? (
          <Text className="px-1 text-sm leading-5 text-text-muted">{group.description}</Text>
        ) : null}

        <View className="gap-2">
          {membersQuery.isLoading ? (
            [0, 1, 2].map((index) => (
              <View key={index} className="flex-row items-center gap-3 rounded-xl bg-bg-subtle p-3">
                <Skeleton className="size-10 rounded-full" />
                <View className="flex-1 gap-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </View>
              </View>
            ))
          ) : membersQuery.isError ? (
            <Text className="rounded-xl bg-danger-bg p-3 text-sm font-semibold text-destructive">
              {t("Failed to load group members.")}
            </Text>
          ) : members.length === 0 ? (
            <Text className="rounded-xl bg-bg-subtle p-3 text-sm text-text-muted">
              {t("No one is in this group yet.")}
            </Text>
          ) : (
            members.map((member) => {
              const name = member.display_name || member.nickname || t("Friend");

              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => dismissThen(() => onOpenMember(member.id))}
                  className="flex-row items-center gap-3 rounded-xl bg-bg-subtle p-3 active:bg-bg-muted"
                >
                  <Avatar className="size-10" alt={name}>
                    {member.avatar_url ? <AvatarImage source={{ uri: member.avatar_url }} /> : null}
                    <AvatarFallback className="bg-brand-lighter" initialsClassName="text-brand" />
                  </Avatar>
                  <View className="min-w-0 flex-1">
                    <Text className="font-extrabold text-text" numberOfLines={1}>
                      {name}
                    </Text>
                    {member.nickname ? (
                      <Text className="text-sm text-text-muted" numberOfLines={1}>
                        @{member.nickname}
                      </Text>
                    ) : null}
                  </View>
                  <Icon as={ChevronRight} className="size-4 text-text-muted" />
                </Pressable>
              );
            })
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
