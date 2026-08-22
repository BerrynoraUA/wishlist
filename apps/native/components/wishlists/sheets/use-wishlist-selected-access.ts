import {
  useGrantWishlistGroupAccess,
  useInfiniteFriendGroups,
  useInfiniteFriendGroupsWithoutWishlistAccess,
  useInfiniteFriends,
  useInfiniteFriendsWithoutWishlistAccess,
  useRevokeWishlistGroupAccess,
  useWishlistAccessList,
} from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useGrantWishlistAccess, useRevokeWishlistAccess } from "@/hooks/use-wishlists";
import type { PeoplePickerItem } from "@/components/ui/people-picker";
import { friendKeys } from "@/lib/friend-query-keys";
import { wishlistKeys } from "@/lib/wishlist-query-keys";
import { SELECTED_FRIENDS_ACCESS_TYPE, SELECTED_GROUPS_ACCESS_TYPE } from "@/lib/wishlists";
import { motionDuration } from "@/lib/motion";
import { useQueryClient } from "@tanstack/react-query";
import { WishlistVisibility, type Wishlist } from "@wishlist/backend/types/wishlist";
import { useGT } from "gt-react-native";
import * as React from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type SelectedAccessTarget = "friends" | "groups";
const ACCESS_PAGE_SIZE = 20;

export function useWishlistSelectedAccess({
  mode,
  open,
  wishlist,
  visibility,
  setVisibility,
}: {
  mode: "create" | "edit";
  open: boolean;
  wishlist?: Wishlist;
  visibility: WishlistVisibility;
  setVisibility: (visibility: WishlistVisibility) => void;
}) {
  const t = useGT();
  const queryClient = useQueryClient();
  const grantAccess = useGrantWishlistAccess();
  const revokeAccess = useRevokeWishlistAccess();
  const grantGroupAccess = useGrantWishlistGroupAccess();
  const revokeGroupAccess = useRevokeWishlistGroupAccess();
  const [selectedFriends, setSelectedFriends] = React.useState<PeoplePickerItem[]>([]);
  const [selectedGroups, setSelectedGroups] = React.useState<PeoplePickerItem[]>([]);
  const [target, setTarget] = React.useState<SelectedAccessTarget>("friends");
  const [friendQuery, setFriendQuery] = React.useState("");
  const [groupQuery, setGroupQuery] = React.useState("");
  const deferredFriendQuery = React.useDeferredValue(friendQuery);
  const deferredGroupQuery = React.useDeferredValue(groupQuery);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [panelMounted, setPanelMounted] = React.useState(false);
  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(-14);
  const panelScaleY = useSharedValue(0.94);
  const canManage = mode === "create" || Boolean(wishlist?.is_owner);
  const wishlistId = wishlist?.id ?? "";
  const panelVisible = visibility === WishlistVisibility.SelectedFriends && canManage;
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }, { scaleY: panelScaleY.value }],
  }));

  // The host sheet renders `null` while closed but still runs this hook, so queries stay
  // idle until the visible picker needs them.
  const queriesEnabled = open && canManage;

  const friendsQuery = useInfiniteFriends({ search: deferredFriendQuery }, ACCESS_PAGE_SIZE, {
    enabled: queriesEnabled && mode === "create" && target === "friends",
  });
  const groupsQuery = useInfiniteFriendGroups({ search: deferredGroupQuery }, ACCESS_PAGE_SIZE, {
    enabled: queriesEnabled && mode === "create" && target === "groups",
  });
  const friendsWithoutAccessQuery = useInfiniteFriendsWithoutWishlistAccess(
    { wishlistId, search: deferredFriendQuery },
    ACCESS_PAGE_SIZE,
    { enabled: queriesEnabled && mode === "edit" && target === "friends" },
  );
  const groupsWithoutAccessQuery = useInfiniteFriendGroupsWithoutWishlistAccess(
    { wishlistId, search: deferredGroupQuery },
    ACCESS_PAGE_SIZE,
    { enabled: queriesEnabled && mode === "edit" && target === "groups" },
  );
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const { items: groups, loadMore: loadMoreGroups } = useInfiniteListData(groupsQuery);
  const { items: friendsWithoutAccess, loadMore: loadMoreFriendsWithoutAccess } =
    useInfiniteListData(friendsWithoutAccessQuery);
  const { items: groupsWithoutAccess, loadMore: loadMoreGroupsWithoutAccess } =
    useInfiniteListData(groupsWithoutAccessQuery);
  const { data: accessList = [], isLoading: accessListLoading } = useWishlistAccessList(
    wishlistId,
    {
      enabled: queriesEnabled && mode === "edit",
    },
  );
  const activeFriendsQuery = mode === "edit" ? friendsWithoutAccessQuery : friendsQuery;
  const activeGroupsQuery = mode === "edit" ? groupsWithoutAccessQuery : groupsQuery;

  const friendOptions = React.useMemo<PeoplePickerItem[]>(() => {
    if (mode === "edit") {
      return friendsWithoutAccess.map((friend) => ({
        id: friend.id,
        name: friend.display_name || friend.nickname,
        subtitle: friend.display_name ? `@${friend.nickname}` : null,
        searchText: friend.nickname,
        avatarUrl: friend.avatar_url,
      }));
    }

    return friends
      .filter((friend) => Boolean(friend.friend_id))
      .map((friend) => ({
        id: friend.friend_id,
        name: friend.display_name || friend.nickname || t("friend"),
        subtitle: friend.nickname ? `@${friend.nickname}` : null,
        searchText: friend.nickname,
        avatarUrl: friend.avatar_url,
      }));
  }, [friends, friendsWithoutAccess, mode, t]);

  const groupOptions = React.useMemo<PeoplePickerItem[]>(() => {
    const source = mode === "edit" ? groupsWithoutAccess : groups;

    return source
      .filter((group) => Boolean(group.id))
      .map((group) => ({
        id: group.id,
        name: group.name,
        subtitle: t("{count} members", { count: group.member_count }),
        group: { icon: group.icon, color: group.color },
      }));
  }, [groups, groupsWithoutAccess, mode, t]);

  const specificAccessList = React.useMemo(
    () =>
      accessList.filter(
        (user) => user.access_type === SELECTED_FRIENDS_ACCESS_TYPE && user.target_type !== "group",
      ),
    [accessList],
  );

  const groupAccessList = React.useMemo(
    () =>
      accessList.filter(
        (item) => item.access_type === SELECTED_GROUPS_ACCESS_TYPE || item.target_type === "group",
      ),
    [accessList],
  );

  React.useEffect(() => {
    if (!open) return;

    setSelectedFriends([]);
    setSelectedGroups([]);
    setTarget("friends");
    setFriendQuery("");
    setGroupQuery("");
    setError(null);
    setIsSaving(false);
  }, [open]);

  React.useEffect(() => {
    if (!open || mode !== "edit" || !wishlist) return;
    if (specificAccessList.length === 0 && groupAccessList.length === 0) return;
    if (
      wishlist.visibility_type !== WishlistVisibility.Private &&
      wishlist.visibility_type !== WishlistVisibility.SelectedFriends
    ) {
      return;
    }

    if (visibility === wishlist.visibility_type) {
      setVisibility(WishlistVisibility.SelectedFriends);
    }
    if (groupAccessList.length > 0 && specificAccessList.length === 0) {
      setTarget("groups");
    }
  }, [
    groupAccessList.length,
    mode,
    open,
    setVisibility,
    specificAccessList.length,
    visibility,
    wishlist,
  ]);

  React.useEffect(() => {
    if (visibility !== WishlistVisibility.SelectedFriends) {
      setSelectedFriends([]);
      setSelectedGroups([]);
      setError(null);
    }
  }, [visibility]);

  React.useEffect(() => {
    if (panelVisible) {
      setPanelMounted(true);
      panelOpacity.value = 0;
      panelTranslateY.value = -14;
      panelScaleY.value = 0.94;
      panelOpacity.value = withTiming(1, { duration: motionDuration.normal });
      panelTranslateY.value = withTiming(0, { duration: motionDuration.normal });
      panelScaleY.value = withTiming(1, { duration: motionDuration.normal });
      return;
    }

    panelOpacity.value = withTiming(0, { duration: motionDuration.normal });
    panelTranslateY.value = withTiming(-14, { duration: motionDuration.normal });
    panelScaleY.value = withTiming(0.94, { duration: motionDuration.normal });

    const timeoutId = setTimeout(() => {
      setPanelMounted(false);
    }, motionDuration.normal);

    return () => clearTimeout(timeoutId);
  }, [panelOpacity, panelScaleY, panelTranslateY, panelVisible]);

  const invalidateAccessQueries = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    await queryClient.invalidateQueries({
      queryKey: friendKeys.withoutWishlistAccess(),
    });
    await queryClient.invalidateQueries({
      queryKey: ["wishlist-access-list"],
      exact: false,
    });
  }, [queryClient]);

  const grantSelectedAccess = React.useCallback(
    async (id: string) => {
      if (visibility !== WishlistVisibility.SelectedFriends) return;
      if (selectedFriends.length === 0 && selectedGroups.length === 0) return;

      setIsSaving(true);
      await Promise.all([
        ...selectedFriends.map((friend) =>
          grantAccess.mutateAsync({
            wishlistId: id,
            grantedToUserId: friend.id,
            accessType: SELECTED_FRIENDS_ACCESS_TYPE,
          }),
        ),
        ...selectedGroups.map((group) =>
          grantGroupAccess.mutateAsync({
            wishlistId: id,
            groupId: group.id,
          }),
        ),
      ]);
      await invalidateAccessQueries();
    },
    [
      grantAccess,
      grantGroupAccess,
      invalidateAccessQueries,
      selectedFriends,
      selectedGroups,
      visibility,
    ],
  );

  const revokeExistingSelectedAccess = React.useCallback(
    async (id: string) => {
      if (specificAccessList.length === 0 && groupAccessList.length === 0) return;

      setIsSaving(true);
      await Promise.all([
        ...specificAccessList.map((friend) =>
          revokeAccess.mutateAsync({
            wishlistId: id,
            targetUserId: friend.id,
          }),
        ),
        ...groupAccessList.map((group) =>
          revokeGroupAccess.mutateAsync({
            wishlistId: id,
            groupId: group.group_id ?? group.id,
          }),
        ),
      ]);
      await invalidateAccessQueries();
    },
    [groupAccessList, invalidateAccessQueries, revokeAccess, revokeGroupAccess, specificAccessList],
  );

  const syncAfterSave = React.useCallback(
    async (id: string, nextVisibility: WishlistVisibility) => {
      if (canManage && nextVisibility !== WishlistVisibility.SelectedFriends) {
        await revokeExistingSelectedAccess(id);
      }

      if (canManage) {
        await grantSelectedAccess(id);
      }
    },
    [canManage, grantSelectedAccess, revokeExistingSelectedAccess],
  );

  const handleRevokeSpecificAccess = React.useCallback(
    async (targetUserId: string) => {
      if (!wishlist) return;

      setError(null);

      try {
        await revokeAccess.mutateAsync({
          wishlistId: wishlist.id,
          targetUserId,
        });
      } catch (revokeError) {
        setError(
          revokeError instanceof Error ? revokeError.message : t("Could not remove access."),
        );
      }
    },
    [revokeAccess, t, wishlist],
  );

  const handleRevokeGroupAccess = React.useCallback(
    async (groupId: string) => {
      if (!wishlist) return;

      setError(null);

      try {
        await revokeGroupAccess.mutateAsync({
          wishlistId: wishlist.id,
          groupId,
        });
      } catch (revokeError) {
        setError(
          revokeError instanceof Error ? revokeError.message : t("Could not remove access."),
        );
      }
    },
    [revokeGroupAccess, t, wishlist],
  );

  return {
    canManage,
    error,
    setError,
    isSaving,
    setIsSaving,
    panelMounted,
    panelAnimatedStyle,
    target,
    setTarget,
    friendQuery,
    setFriendQuery,
    groupQuery,
    setGroupQuery,
    selectedFriends,
    setSelectedFriends,
    selectedGroups,
    setSelectedGroups,
    friendOptions,
    groupOptions,
    friendsLoading: activeFriendsQuery.isLoading,
    friendsError: activeFriendsQuery.isError,
    friendsFetchingMore: activeFriendsQuery.isFetchingNextPage,
    loadMoreFriends: mode === "edit" ? loadMoreFriendsWithoutAccess : loadMoreFriends,
    groupsLoading: activeGroupsQuery.isLoading,
    groupsError: activeGroupsQuery.isError,
    groupsFetchingMore: activeGroupsQuery.isFetchingNextPage,
    loadMoreGroups: mode === "edit" ? loadMoreGroupsWithoutAccess : loadMoreGroups,
    accessListLoading,
    specificAccessList,
    groupAccessList,
    syncAfterSave,
    grantSelectedAccess,
    handleRevokeSpecificAccess,
    handleRevokeGroupAccess,
    revokeAccess,
    revokeGroupAccess,
  };
}
