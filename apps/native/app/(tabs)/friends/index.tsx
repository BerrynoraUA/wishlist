import { FriendCard } from "@/components/friends/friend-card";
import { FriendGroupCard } from "@/components/friends/friend-group-card";
import { FriendsTabs, type FriendsTab } from "@/components/friends/friends-tabs";
import { OutgoingRequestCard } from "@/components/friends/outgoing-request-card";
import { RequestCard } from "@/components/friends/request-card";
import { FriendGroupSheet } from "@/components/friends/sheets/friend-group-sheet";
import { InlineState } from "@/components/shared/inline-state";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ExpandingSearchHeader } from "@/components/ui/expanding-search-header";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { useUserGuideTargetRegistration } from "@/components/user-guide/user-guide-provider";
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useDeleteFriendGroup,
  useInfiniteFriendGroups,
  useInfiniteFriends,
  useInfiniteIncomingFriendRequests,
  useInfiniteOutgoingFriendRequests,
  useRejectFriendRequest,
  useRemoveFriend,
  useUpdateFriendGroup,
} from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { chunkRows, useTabBarContentPadding } from "@/lib/layout";
import type {
  FriendGroup,
  FriendRequestWithDetails,
  FriendWithDetails,
} from "@wishlist/backend/types/friends";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";

type SheetState =
  | { type: "group"; group: FriendGroup }
  | { type: "removeFriend"; friendId: string }
  | { type: "deleteGroup"; group: FriendGroup }
  | null;

type FriendEntry = FriendWithDetails | FriendGroup | FriendRequestWithDetails;
type FriendsRow = FriendEntry[];
const FRIENDS_PAGE_SIZE = 20;

export default function FriendsScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tab, setTab] = React.useState<FriendsTab>("friends");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const { requestMeasure } = useUserGuideTargetRegistration();
  const { paddingTop, onHeaderLayout } = usePinnedListHeaderPadding();
  const paddingBottom = useTabBarContentPadding();

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.length === 0) setDebouncedSearch("");
  }

  function handleTabChange(value: FriendsTab) {
    setTab(value);
    setSearch("");
    setDebouncedSearch("");
  }

  const friendsParams = React.useMemo(
    () => ({ search: tab === "friends" ? debouncedSearch : undefined }),
    [debouncedSearch, tab],
  );
  const groupsParams = React.useMemo(
    () => ({ search: tab === "groups" ? debouncedSearch : undefined }),
    [debouncedSearch, tab],
  );
  const friendsQuery = useInfiniteFriends(friendsParams, FRIENDS_PAGE_SIZE);
  const groupsQuery = useInfiniteFriendGroups(groupsParams, FRIENDS_PAGE_SIZE);
  const requestsQuery = useInfiniteIncomingFriendRequests(FRIENDS_PAGE_SIZE);
  const outgoingQuery = useInfiniteOutgoingFriendRequests(FRIENDS_PAGE_SIZE);
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriend = useRemoveFriend();
  const updateGroup = useUpdateFriendGroup();
  const deleteGroup = useDeleteFriendGroup();

  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const { items: groups, loadMore: loadMoreGroups } = useInfiniteListData(groupsQuery);
  const { items: requests, loadMore: loadMoreRequests } = useInfiniteListData(requestsQuery);
  const { items: outgoing, loadMore: loadMoreOutgoing } = useInfiniteListData(outgoingQuery);

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
  const activeQuery =
    tab === "groups"
      ? groupsQuery
      : tab === "requests"
        ? requestsQuery
        : tab === "sent"
          ? outgoingQuery
          : friendsQuery;
  const loadMore =
    tab === "groups"
      ? loadMoreGroups
      : tab === "requests"
        ? loadMoreRequests
        : tab === "sent"
          ? loadMoreOutgoing
          : loadMoreFriends;

  function handleSubmitGroup(payload: Parameters<typeof updateGroup.mutateAsync>[0]["payload"]) {
    if (sheet?.type !== "group") return Promise.resolve();

    return updateGroup.mutateAsync({ groupId: sheet.group.id, payload });
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
        <PinnedListHeader contentWidth={contentWidth} onLayout={onHeaderLayout}>
          {tab === "friends" || tab === "groups" ? (
            <ExpandingSearchHeader
              search={search}
              onChangeSearch={handleSearchChange}
              placeholder={tab === "groups" ? t("Search groups") : t("Search friends")}
              contentWidth={contentWidth}
            >
              <FriendsTabs
                value={tab}
                friendsCount={friends.length}
                groupsCount={groups.length}
                requestsCount={requests.length}
                sentCount={outgoing.length}
                onChange={handleTabChange}
              />
            </ExpandingSearchHeader>
          ) : (
            <FriendsTabs
              value={tab}
              friendsCount={friends.length}
              groupsCount={groups.length}
              requestsCount={requests.length}
              sentCount={outgoing.length}
              onChange={handleTabChange}
            />
          )}
        </PinnedListHeader>
        <StyledFlashList
          data={isLoading || isError ? [] : rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.map((entry) => entry.id).join(":")}
          className="flex-1"
          contentContainerStyle={{ paddingTop, paddingBottom }}
          onScroll={requestMeasure}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View className="h-4" />}
          onEndReached={loadMore}
          isLoadingMore={activeQuery.isFetchingNextPage}
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
                  mascot={debouncedSearch ? "magnifying-glass" : "sad-alone"}
                  message={
                    tab === "groups"
                      ? t("No groups yet.")
                      : tab === "requests"
                        ? t("No incoming requests.")
                        : tab === "sent"
                          ? t("No sent requests.")
                          : t("No friends yet.")
                  }
                  pointToCreateButton={!debouncedSearch && (tab === "friends" || tab === "groups")}
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

        {sheet?.type === "group" ? (
          <FriendGroupSheet
            open
            group={sheet.group}
            friends={friends}
            isSaving={updateGroup.isPending}
            onOpenChange={(open) => {
              if (!open) {
                setSheet(null);
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
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={() => onOpenChange(false)}>
      <View className="gap-4 px-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{title}</Text>
          <Text className="text-sm text-text-muted">{description}</Text>
        </View>
        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={isPending}
            onPress={() => void sheetRef.current?.dismiss()}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button className="flex-1" variant="destructive" disabled={isPending} onPress={onConfirm}>
            {isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{confirmLabel}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
