import { FriendCard } from "@/components/friends/friend-card";
import { FriendGroupCard } from "@/components/friends/friend-group-card";
import { FriendsTabs, type FriendsTab } from "@/components/friends/friends-tabs";
import { OutgoingRequestCard } from "@/components/friends/outgoing-request-card";
import { RequestCard } from "@/components/friends/request-card";
import { AddFriendSheet } from "@/components/friends/sheets/add-friend-sheet";
import { FriendGroupSheet } from "@/components/friends/sheets/friend-group-sheet";
import { InlineState } from "@/components/shared/inline-state";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import {
  UserGuideTarget,
  useUserGuideStepCompletion,
} from "@/components/user-guide/user-guide-provider";
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useCreateFriendGroup,
  useDeleteFriendGroup,
  useFriendGroups,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRejectFriendRequest,
  useRemoveFriend,
  useUpdateFriendGroup,
} from "@/hooks/use-friends";
import { chunkRows } from "@/lib/layout";
import type {
  FriendGroup,
  FriendRequestWithDetails,
  FriendWithDetails,
} from "@wishlist/backend/types/friends";
import { Stack, useRouter } from "expo-router";
import { Plus, Search, UserPlus, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SheetState =
  | { type: "add" }
  | { type: "group"; group: FriendGroup | null }
  | { type: "removeFriend"; friendId: string }
  | { type: "deleteGroup"; group: FriendGroup }
  | null;

type FriendEntry = FriendWithDetails | FriendGroup | FriendRequestWithDetails;
type FriendsRow = FriendEntry[];

export default function FriendsScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<FriendsTab>("friends");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [pendingGuideModalStep, setPendingGuideModalStep] = React.useState<number | null>(null);
  const completeAddFriendStep = useUserGuideStepCompletion(10);
  const completeCreateGroupStep = useUserGuideStepCompletion(12);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const friendsParams = React.useMemo(
    () => ({ search: tab === "friends" ? debouncedSearch : undefined }),
    [debouncedSearch, tab],
  );
  const groupsParams = React.useMemo(
    () => ({ search: tab === "groups" ? debouncedSearch : undefined }),
    [debouncedSearch, tab],
  );
  const friendsQuery = useFriends(friendsParams);
  const groupsQuery = useFriendGroups(groupsParams);
  const requestsQuery = useIncomingFriendRequests();
  const outgoingQuery = useOutgoingFriendRequests();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriend = useRemoveFriend();
  const createGroup = useCreateFriendGroup();
  const updateGroup = useUpdateFriendGroup();
  const deleteGroup = useDeleteFriendGroup();

  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const friends = friendsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const outgoing = outgoingQuery.data ?? [];

  const activeItems = React.useMemo<FriendEntry[]>(() => {
    if (tab === "groups") return groups;
    if (tab === "requests") return requests;
    if (tab === "sent") return outgoing;
    return friends;
  }, [friends, groups, outgoing, requests, tab]);

  const rows = React.useMemo<FriendsRow[]>(
    () => chunkRows(activeItems, columns),
    [activeItems, columns],
  );
  const isLoading =
    tab === "groups"
      ? groupsQuery.isLoading
      : tab === "requests"
        ? requestsQuery.isLoading
        : tab === "sent"
          ? outgoingQuery.isLoading
          : friendsQuery.isLoading;
  const isError =
    tab === "groups"
      ? groupsQuery.isError
      : tab === "requests"
        ? requestsQuery.isError
        : tab === "sent"
          ? outgoingQuery.isError
          : friendsQuery.isError;

  function handleSubmitGroup(payload: Parameters<typeof createGroup.mutateAsync>[0]) {
    if (sheet?.type === "group" && sheet.group) {
      return updateGroup.mutateAsync({ groupId: sheet.group.id, payload });
    }

    return createGroup.mutateAsync(payload).then((result) => {
      if (pendingGuideModalStep === 12) {
        completeCreateGroupStep();
        setPendingGuideModalStep(null);
      }
      return result;
    });
  }

  function completePendingGuideModal(step: number, completeStep: () => void) {
    if (pendingGuideModalStep === step) {
      completeStep();
      setPendingGuideModalStep(null);
    }
  }

  function renderRow({ item }: { item: FriendsRow }) {
    return (
      <View
        className="flex-row"
        style={{
          alignSelf: "center",
          gap: gridGap,
          width: contentWidth,
        }}
      >
        {item.map((entry) => (
          <View key={entry.id} style={{ width: cardWidth }}>
            {tab === "groups" ? (
              <FriendGroupCard
                group={entry as FriendGroup}
                onEdit={(group) => setSheet({ type: "group", group })}
                onDelete={(group) => setSheet({ type: "deleteGroup", group })}
              />
            ) : tab === "requests" ? (
              <RequestCard
                request={entry as FriendRequestWithDetails}
                accepting={acceptRequest.isPending}
                rejecting={rejectRequest.isPending}
                onAccept={() => acceptRequest.mutate(entry.id)}
                onReject={() => rejectRequest.mutate(entry.id)}
              />
            ) : tab === "sent" ? (
              <OutgoingRequestCard
                request={entry as FriendRequestWithDetails}
                cancelling={cancelRequest.isPending}
                onCancel={() => cancelRequest.mutate(entry.id)}
              />
            ) : (
              <FriendCard
                friend={entry as FriendWithDetails}
                onOpen={(friendId) =>
                  router.push({ pathname: "/friends/[id]", params: { id: friendId } } as never)
                }
                onRemove={(friendId) => setSheet({ type: "removeFriend", friendId })}
              />
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("Friends") }} />
      <View className="flex-1 bg-bg">
        <StyledFlashList
          data={isLoading || isError ? [] : rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.map((entry) => entry.id).join(":")}
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="pb-8"
          contentContainerStyle={{ paddingTop: insets.top + 24 }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListHeaderComponent={
            <View className="gap-5 self-center pb-5" style={{ width: contentWidth }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-2xl font-extrabold text-text">{t("Friends")}</Text>
                </View>
                <UserGuideTarget targetId="friends-invite">
                  <Button
                    onPress={() => {
                      setPendingGuideModalStep(10);
                      setSheet({ type: "add" });
                    }}
                    className="rounded-full"
                  >
                    <Icon as={UserPlus} className="size-4 text-primary-foreground" />
                    <Text>{t("Invite")}</Text>
                  </Button>
                </UserGuideTarget>
              </View>

              <FriendsTabs
                value={tab}
                friendsCount={friends.length}
                groupsCount={groups.length}
                requestsCount={requests.length}
                sentCount={outgoing.length}
                onChange={(value) => {
                  setTab(value);
                  setSearch("");
                  setDebouncedSearch("");
                }}
              />

              <View className="flex-row items-center gap-2">
                {tab === "friends" || tab === "groups" ? (
                  <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3 shadow-sm">
                    <Icon as={Search} className="size-4 text-text-muted" />
                    <Input
                      value={search}
                      onChangeText={setSearch}
                      placeholder={tab === "groups" ? t("Search groups") : t("Search friends")}
                      className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
                      returnKeyType="search"
                    />
                    {search.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        accessibilityLabel={t("Clear search")}
                        onPress={() => {
                          setSearch("");
                          setDebouncedSearch("");
                        }}
                        className="size-9 shrink-0 rounded-full"
                      >
                        <Icon as={X} className="size-4 text-text-muted" />
                      </Button>
                    ) : null}
                  </View>
                ) : null}
                {tab === "groups" ? (
                  <UserGuideTarget targetId="friends-create-group">
                    <Button
                      onPress={() => {
                        setPendingGuideModalStep(12);
                        setSheet({ type: "group", group: null });
                      }}
                      className="rounded-full"
                    >
                      <Icon as={Plus} className="size-4 text-primary-foreground" />
                      <Text>{t("Create")}</Text>
                    </Button>
                  </UserGuideTarget>
                ) : null}
              </View>
            </View>
          }
          ListFooterComponent={
            <View className="gap-4 self-center" style={{ width: contentWidth }}>
              {isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null}
              {isError ? <InlineState message={t("Failed to load friends.")} /> : null}
              {!isLoading && !isError && activeItems.length === 0 ? (
                <InlineState
                  message={
                    tab === "groups"
                      ? t("No groups yet.")
                      : tab === "requests"
                        ? t("No incoming requests.")
                        : tab === "sent"
                          ? t("No sent requests.")
                          : t("No friends yet.")
                  }
                />
              ) : null}
            </View>
          }
          extraData={{
            tab,
            cardWidth,
            contentWidth,
            gridGap,
            acceptPending: acceptRequest.isPending,
            rejectPending: rejectRequest.isPending,
            cancelPending: cancelRequest.isPending,
          }}
        />

        {sheet?.type === "add" ? (
          <AddFriendSheet
            open
            onOpenChange={(open) => {
              if (!open) {
                setSheet(null);
                completePendingGuideModal(10, completeAddFriendStep);
              }
            }}
          />
        ) : null}
        {sheet?.type === "group" ? (
          <FriendGroupSheet
            open
            group={sheet.group}
            friends={friends}
            isSaving={createGroup.isPending || updateGroup.isPending}
            onOpenChange={(open) => {
              if (!open) {
                setSheet(null);
                completePendingGuideModal(12, completeCreateGroupStep);
              }
            }}
            onSubmit={handleSubmitGroup}
          />
        ) : null}
        {sheet?.type === "removeFriend" ? (
          <ConfirmActionSheet
            open
            title={t("Remove Friend")}
            description={t(
              "Are you sure you want to remove this friend? You will need to send a new friend request to reconnect.",
            )}
            confirmLabel={t("Remove Friend")}
            isPending={removeFriend.isPending}
            error={removeFriend.error?.message}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            onConfirm={() => {
              removeFriend.mutate(sheet.friendId, {
                onSuccess: () => setSheet(null),
              });
            }}
          />
        ) : null}
        {sheet?.type === "deleteGroup" ? (
          <ConfirmActionSheet
            open
            title={t("Delete group")}
            description={t("Are you sure you want to delete this group?")}
            confirmLabel={t("Delete")}
            isPending={deleteGroup.isPending}
            error={deleteGroup.error?.message}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            onConfirm={() => {
              deleteGroup.mutate(sheet.group.id, {
                onSuccess: () => setSheet(null),
              });
            }}
          />
        ) : null}
      </View>
    </>
  );
}

function ConfirmActionSheet({
  open,
  title,
  description,
  confirmLabel,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!open) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
    >
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{title}</Text>
          <Text className="text-sm text-text-muted">{description}</Text>
        </View>
        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
        <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={isPending}
            onPress={() => void sheetRef.current?.dismiss()}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button variant="destructive" disabled={isPending} onPress={onConfirm}>
            {isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{confirmLabel}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
