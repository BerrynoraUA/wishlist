import {
  useFriendGroups,
  useFriendGroupsWithoutWishlistAccess,
  useFriends,
  useFriendsWithoutWishlistAccess,
  useGrantWishlistGroupAccess,
  useRevokeWishlistGroupAccess,
  useWishlistAccessList,
} from "@/hooks/use-friends";
import {
  useGrantWishlistAccess,
  useRevokeWishlistAccess,
  wishlistKeys,
} from "@/hooks/use-wishlists";
import { SELECTED_FRIENDS_ACCESS_TYPE, SELECTED_GROUPS_ACCESS_TYPE } from "@/lib/wishlists";
import { motionDuration } from "@/lib/motion";
import { useQueryClient } from "@tanstack/react-query";
import { WishlistVisibility, type Wishlist } from "@wishlist/backend/types/wishlist";
import { useGT } from "gt-react-native";
import * as React from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type WishlistAccessOption = {
  id: string;
  nickname: string;
};

export type SelectedAccessTarget = "friends" | "groups";

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
  const [selectedFriends, setSelectedFriends] = React.useState<WishlistAccessOption[]>([]);
  const [selectedGroups, setSelectedGroups] = React.useState<WishlistAccessOption[]>([]);
  const [target, setTarget] = React.useState<SelectedAccessTarget>("friends");
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

  const {
    data: friends = [],
    isLoading: friendsLoading,
    isError: friendsError,
  } = useFriends({
    skip: 0,
    take: 100,
  });
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError,
  } = useFriendGroups({
    skip: 0,
    take: 100,
  });
  const {
    data: friendsWithoutAccess = [],
    isLoading: friendsWithoutAccessLoading,
    isError: friendsWithoutAccessError,
  } = useFriendsWithoutWishlistAccess({
    wishlistId,
    skip: 0,
    take: 100,
  });
  const {
    data: groupsWithoutAccess = [],
    isLoading: groupsWithoutAccessLoading,
    isError: groupsWithoutAccessError,
  } = useFriendGroupsWithoutWishlistAccess({
    wishlistId,
    skip: 0,
    take: 100,
  });
  const { data: accessList = [], isLoading: accessListLoading } = useWishlistAccessList(wishlistId);

  const friendOptions = React.useMemo<WishlistAccessOption[]>(() => {
    if (mode === "edit") {
      return friendsWithoutAccess.map((friend) => ({
        id: friend.id,
        nickname: friend.nickname,
      }));
    }

    return friends
      .map((friend) => ({
        id: friend.friend_id,
        nickname: friend.nickname ?? friend.display_name ?? t("friend"),
      }))
      .filter((friend) => Boolean(friend.id));
  }, [friends, friendsWithoutAccess, mode, t]);

  const groupOptions = React.useMemo<WishlistAccessOption[]>(() => {
    const source = mode === "edit" ? groupsWithoutAccess : groups;

    return source
      .map((group) => ({
        id: group.id,
        nickname: group.name,
      }))
      .filter((group) => Boolean(group.id));
  }, [groups, groupsWithoutAccess, mode]);

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
      queryKey: ["friends-without-wishlist-access"],
      exact: false,
    });
    await queryClient.invalidateQueries({
      queryKey: ["friend-groups-without-wishlist-access"],
      exact: false,
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
    selectedFriends,
    setSelectedFriends,
    selectedGroups,
    setSelectedGroups,
    friendOptions,
    groupOptions,
    friendsLoading,
    friendsError,
    groupsLoading,
    groupsError,
    friendsWithoutAccessLoading,
    friendsWithoutAccessError,
    groupsWithoutAccessLoading,
    groupsWithoutAccessError,
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
