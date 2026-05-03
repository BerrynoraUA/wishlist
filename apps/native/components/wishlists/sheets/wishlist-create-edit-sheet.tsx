import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
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
  useCreateWishlist,
  useGrantWishlistAccess,
  useRevokeWishlistAccess,
  useUpdateWishlist,
  wishlistKeys,
} from "@/hooks/use-wishlists";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  EMPTY_WISHLIST_FORM,
  SELECTED_FRIENDS_ACCESS_TYPE,
  SELECTED_GROUPS_ACCESS_TYPE,
  WISHLIST_ACCENT_OPTIONS,
  WISHLIST_VISIBILITY_OPTIONS,
  getWishlistAccentClass,
  toWishlistFormValues,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { hasInvalidOptionalUrl } from "@/lib/urls";
import {
  SlidingOptionSelector,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { motionDuration } from "@/lib/motion";
import { useQueryClient } from "@tanstack/react-query";
import type { WishlistAccessUser } from "@wishlist/backend/types/friends";
import {
  WishlistVisibility,
  type Wishlist,
  type WishlistFormValues,
} from "@wishlist/backend/types/wishlist";
import { CalendarDays, Check, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type WishlistAccessOption = {
  id: string;
  nickname: string;
};

type SelectedAccessTarget = "friends" | "groups";

type VisibilitySelectorValue =
  | "private"
  | "selected-friends"
  | "selected-groups"
  | "friends"
  | "public";

function parseDateFieldValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateFieldValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateFieldLabel(value: string) {
  const date = parseDateFieldValue(value);
  return date ? dateLabelFormatter.format(date) : "Select a date";
}

export function WishlistCreateEditSheet({
  mode,
  open,
  wishlist,
  onOpenChange,
}: {
  mode: "create" | "edit";
  open: boolean;
  wishlist?: Wishlist;
  onOpenChange: (open: boolean) => void;
}) {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const queryClient = useQueryClient();
  const createMutation = useCreateWishlist();
  const updateMutation = useUpdateWishlist();
  const grantAccess = useGrantWishlistAccess();
  const revokeAccess = useRevokeWishlistAccess();
  const grantGroupAccess = useGrantWishlistGroupAccess();
  const revokeGroupAccess = useRevokeWishlistGroupAccess();
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    grantAccess.isPending ||
    revokeAccess.isPending ||
    grantGroupAccess.isPending ||
    revokeGroupAccess.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const [values, setValues] = React.useState<WishlistFormValues>(EMPTY_WISHLIST_FORM);
  const [selectedAccessFriends, setSelectedAccessFriends] = React.useState<WishlistAccessOption[]>(
    [],
  );
  const [selectedAccessGroups, setSelectedAccessGroups] = React.useState<WishlistAccessOption[]>(
    [],
  );
  const [accessTab, setAccessTab] = React.useState<"friends" | "groups">("friends");
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const [isSavingAccess, setIsSavingAccess] = React.useState(false);
  const [accessPanelMounted, setAccessPanelMounted] = React.useState(false);
  const accessPanelOpacity = useSharedValue(0);
  const accessPanelTranslateY = useSharedValue(-14);
  const accessPanelScaleY = useSharedValue(0.94);
  const title = mode === "edit" ? "Edit Wishlist" : "Create Wishlist";
  const imageUrlInvalid = hasInvalidOptionalUrl(values.imageUrl);
  const canManageSelectedAccess = mode === "create" || Boolean(wishlist?.is_owner);
  const wishlistId = wishlist?.id ?? "";
  const canSubmit = !isPending && !isSavingAccess && values.title.trim() !== "" && !imageUrlInvalid;
  const accessPanelVisible =
    values.visibility === WishlistVisibility.SelectedFriends && canManageSelectedAccess;
  const accessPanelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: accessPanelOpacity.value,
    transform: [{ translateY: accessPanelTranslateY.value }, { scaleY: accessPanelScaleY.value }],
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
        nickname: friend.nickname ?? friend.display_name ?? "friend",
      }))
      .filter((friend) => Boolean(friend.id));
  }, [friends, friendsWithoutAccess, mode]);

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
        (target) =>
          target.access_type === SELECTED_GROUPS_ACCESS_TYPE || target.target_type === "group",
      ),
    [accessList],
  );

  React.useEffect(() => {
    if (!open) return;

    setValues(toWishlistFormValues(wishlist));
    setSelectedAccessFriends([]);
    setSelectedAccessGroups([]);
    setAccessTab("friends");
    setAccessError(null);
  }, [open, wishlist]);

  React.useEffect(() => {
    if (!open || mode !== "edit" || !wishlist) return;
    if (specificAccessList.length === 0 && groupAccessList.length === 0) return;
    if (
      wishlist.visibility_type !== WishlistVisibility.Private &&
      wishlist.visibility_type !== WishlistVisibility.SelectedFriends
    ) {
      return;
    }

    setValues((current) => {
      if (current.visibility !== wishlist.visibility_type) return current;
      return { ...current, visibility: WishlistVisibility.SelectedFriends };
    });
    if (groupAccessList.length > 0 && specificAccessList.length === 0) {
      setAccessTab("groups");
    }
  }, [groupAccessList.length, mode, open, specificAccessList.length, wishlist]);

  React.useEffect(() => {
    if (values.visibility !== WishlistVisibility.SelectedFriends) {
      setSelectedAccessFriends([]);
      setSelectedAccessGroups([]);
      setAccessError(null);
    }
  }, [values.visibility]);

  React.useEffect(() => {
    if (accessPanelVisible) {
      setAccessPanelMounted(true);
      accessPanelOpacity.value = 0;
      accessPanelTranslateY.value = -14;
      accessPanelScaleY.value = 0.94;
      accessPanelOpacity.value = withTiming(1, { duration: motionDuration.normal });
      accessPanelTranslateY.value = withTiming(0, { duration: motionDuration.normal });
      accessPanelScaleY.value = withTiming(1, { duration: motionDuration.normal });
      return;
    }

    accessPanelOpacity.value = withTiming(0, { duration: motionDuration.normal });
    accessPanelTranslateY.value = withTiming(-14, { duration: motionDuration.normal });
    accessPanelScaleY.value = withTiming(0.94, { duration: motionDuration.normal });

    const timeoutId = setTimeout(() => {
      setAccessPanelMounted(false);
    }, motionDuration.normal);

    return () => clearTimeout(timeoutId);
  }, [accessPanelOpacity, accessPanelScaleY, accessPanelTranslateY, accessPanelVisible]);

  if (!open) return null;

  function handleClose() {
    if (!sheetRef.current) {
      onOpenChange(false);
      return;
    }

    void sheetRef.current.dismiss();
  }

  function patchValues(patch: Partial<WishlistFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleVisibilityChange(
    visibility: WishlistFormValues["visibility"],
    selectedAccessTarget?: SelectedAccessTarget,
  ) {
    patchValues({ visibility });
    if (selectedAccessTarget) {
      setAccessTab(selectedAccessTarget);
    }
  }

  async function invalidateAccessQueries(id: string) {
    await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    await queryClient.invalidateQueries({
      queryKey: ["friends-without-wishlist-access", id],
      exact: false,
    });
    await queryClient.invalidateQueries({
      queryKey: ["friend-groups-without-wishlist-access", id],
      exact: false,
    });
    await queryClient.invalidateQueries({
      queryKey: ["wishlist-access-list", id],
      exact: false,
    });
  }

  async function grantSelectedAccess(id: string) {
    if (values.visibility !== WishlistVisibility.SelectedFriends) return;
    if (selectedAccessFriends.length === 0 && selectedAccessGroups.length === 0) return;

    setIsSavingAccess(true);
    await Promise.all([
      ...selectedAccessFriends.map((friend) =>
        grantAccess.mutateAsync({
          wishlistId: id,
          grantedToUserId: friend.id,
          accessType: SELECTED_FRIENDS_ACCESS_TYPE,
        }),
      ),
      ...selectedAccessGroups.map((group) =>
        grantGroupAccess.mutateAsync({
          wishlistId: id,
          groupId: group.id,
        }),
      ),
    ]);
    await invalidateAccessQueries(id);
  }

  async function revokeExistingSelectedAccess(id: string) {
    if (specificAccessList.length === 0 && groupAccessList.length === 0) return;

    setIsSavingAccess(true);
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
    await invalidateAccessQueries(id);
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setAccessError(null);
    setIsSavingAccess(false);

    try {
      if (mode === "edit" && wishlist) {
        await updateMutation.mutateAsync({ id: wishlist.id, values });

        if (canManageSelectedAccess && values.visibility !== WishlistVisibility.SelectedFriends) {
          await revokeExistingSelectedAccess(wishlist.id);
        }

        if (canManageSelectedAccess) {
          await grantSelectedAccess(wishlist.id);
        }

        handleClose();
        return;
      }

      const createdWishlist = await createMutation.mutateAsync(values);
      await grantSelectedAccess(createdWishlist.id);
      handleClose();
    } catch (submitError) {
      setAccessError(
        submitError instanceof Error ? submitError.message : "Could not save selected access.",
      );
    } finally {
      setIsSavingAccess(false);
    }
  }

  async function handleRevokeSpecificAccess(targetUserId: string) {
    if (!wishlist) return;

    setAccessError(null);

    try {
      await revokeAccess.mutateAsync({
        wishlistId: wishlist.id,
        targetUserId,
      });
    } catch (revokeError) {
      setAccessError(
        revokeError instanceof Error ? revokeError.message : "Could not remove access.",
      );
    }
  }

  async function handleRevokeGroupAccess(groupId: string) {
    if (!wishlist) return;

    setAccessError(null);

    try {
      await revokeGroupAccess.mutateAsync({
        wishlistId: wishlist.id,
        groupId,
      });
    } catch (revokeError) {
      setAccessError(
        revokeError instanceof Error ? revokeError.message : "Could not remove access.",
      );
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[0.7, 1]}
      scrollable
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
      header={<Text className="mx-5 mt-5 text-lg font-extrabold text-text">{title}</Text>}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isPending}
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </Button>
          <Button className="min-w-0 flex-1" disabled={!canSubmit} onPress={handleSubmit}>
            {isPending || isSavingAccess ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : null}
            <Text>{mode === "edit" ? "Save changes" : "Create wishlist"}</Text>
          </Button>
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
      >
        <Field label="Name">
          <Input
            value={values.title}
            onChangeText={(title) => patchValues({ title })}
            placeholder="Birthday gifts"
          />
        </Field>

        <Field label="Description">
          <Input
            value={values.description}
            onChangeText={(description) => patchValues({ description })}
            placeholder="A short note about this wishlist"
            multiline
            className="h-24 items-start py-3"
            textAlignVertical="top"
          />
        </Field>

        <Field label="Visibility">
          <VisibilitySelector
            value={values.visibility}
            selectedAccessTarget={accessTab}
            onChange={handleVisibilityChange}
          />
          {accessPanelMounted ? (
            <Animated.View
              layout={LinearTransition.duration(motionDuration.normal)}
              className="gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-subtle p-3"
              style={accessPanelAnimatedStyle}
            >
              {accessTab === "friends" ? (
                <WishlistAccessPicker
                  title="Selected friends"
                  options={friendOptions}
                  selected={selectedAccessFriends}
                  onChange={(nextSelected) => {
                    setSelectedAccessFriends(nextSelected);
                    setAccessError(null);
                  }}
                  isLoading={mode === "edit" ? friendsWithoutAccessLoading : friendsLoading}
                  isError={mode === "edit" ? friendsWithoutAccessError : friendsError}
                  emptyLabel={
                    mode === "edit"
                      ? "All available friends already have access."
                      : "No friends found yet."
                  }
                  errorLabel="Could not load friends right now."
                  existingAccess={mode === "edit" ? specificAccessList : []}
                  existingAccessTitle={mode === "edit" ? "Already selected" : undefined}
                  existingAccessEmptyLabel={
                    accessListLoading ? "Loading current access..." : "No selected friends yet."
                  }
                  onRevokeAccess={mode === "edit" ? handleRevokeSpecificAccess : undefined}
                  revokingTargetId={revokeAccess.variables?.targetUserId ?? null}
                />
              ) : (
                <WishlistAccessPicker
                  title="Selected groups"
                  options={groupOptions}
                  selected={selectedAccessGroups}
                  onChange={(nextSelected) => {
                    setSelectedAccessGroups(nextSelected);
                    setAccessError(null);
                  }}
                  isLoading={mode === "edit" ? groupsWithoutAccessLoading : groupsLoading}
                  isError={mode === "edit" ? groupsWithoutAccessError : groupsError}
                  emptyLabel={
                    mode === "edit"
                      ? "All available groups already have access."
                      : "No groups found yet."
                  }
                  errorLabel="Could not load groups right now."
                  searchPlaceholder="Search groups"
                  existingAccess={mode === "edit" ? groupAccessList : []}
                  existingAccessTitle={mode === "edit" ? "Already selected" : undefined}
                  existingAccessEmptyLabel={
                    accessListLoading ? "Loading current access..." : "No selected groups yet."
                  }
                  onRevokeAccess={mode === "edit" ? handleRevokeGroupAccess : undefined}
                  revokingTargetId={revokeGroupAccess.variables?.groupId ?? null}
                />
              )}
            </Animated.View>
          ) : null}
        </Field>

        <Field label="Accent">
          <AccentSelector value={values.accent} onChange={(accent) => patchValues({ accent })} />
        </Field>

        <Field label="Event date (optional)">
          <EventDatePicker
            value={values.eventDate}
            onChange={(eventDate) => patchValues({ eventDate })}
          />
        </Field>

        <Field label="Image URL">
          <Input
            value={values.imageUrl}
            onChangeText={(imageUrl) => patchValues({ imageUrl })}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
            className={imageUrlInvalid ? "border-destructive" : undefined}
          />
          {imageUrlInvalid ? (
            <Text className="text-xs font-semibold text-destructive">Enter valid Url</Text>
          ) : null}
        </Field>

        {error ? (
          <Text className="text-sm font-semibold text-destructive">{error.message}</Text>
        ) : null}
        {accessError ? (
          <Text className="text-sm font-semibold text-destructive">{accessError}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function VisibilitySelector({
  value,
  selectedAccessTarget,
  onChange,
}: {
  value: WishlistFormValues["visibility"];
  selectedAccessTarget: SelectedAccessTarget;
  onChange: (
    visibility: WishlistFormValues["visibility"],
    selectedAccessTarget?: SelectedAccessTarget,
  ) => void;
}) {
  const selectorValue: VisibilitySelectorValue =
    value === WishlistVisibility.SelectedFriends
      ? selectedAccessTarget === "groups"
        ? "selected-groups"
        : "selected-friends"
      : (WISHLIST_VISIBILITY_OPTIONS.find((option) => option.visibility === value)?.value ??
        "friends");

  const rows = React.useMemo(() => {
    const privateOption = WISHLIST_VISIBILITY_OPTIONS[3];
    const selectedFriendsOption = WISHLIST_VISIBILITY_OPTIONS[2];
    const friendsOption = WISHLIST_VISIBILITY_OPTIONS[1];
    const publicOption = WISHLIST_VISIBILITY_OPTIONS[0];

    const orderedOptions: {
      value: VisibilitySelectorValue;
      label: string;
      icon: (typeof WISHLIST_VISIBILITY_OPTIONS)[number]["icon"];
      visibility: WishlistFormValues["visibility"];
      selectedAccessTarget?: SelectedAccessTarget;
      surfaceClassName: string;
      indicatorClassName?: string;
      selectedIconClassName?: string;
      selectedTextClassName?: string;
    }[] = [
      {
        ...privateOption,
        value: "private",
      },
      {
        ...selectedFriendsOption,
        value: "selected-friends",
        selectedAccessTarget: "friends",
        indicatorClassName: "rounded-full border border-brand bg-brand-lighter",
        selectedIconClassName: "text-brand",
        selectedTextClassName: "text-brand",
      },
      {
        value: "selected-groups",
        label: "Selected groups",
        icon: friendsOption.icon,
        visibility: WishlistVisibility.SelectedFriends,
        selectedAccessTarget: "groups",
        surfaceClassName: "bg-info-bg",
        indicatorClassName: "rounded-full border border-info bg-info-bg",
        selectedIconClassName: "text-info",
        selectedTextClassName: "text-info",
      },
      {
        ...friendsOption,
        value: "friends",
      },
      {
        ...publicOption,
        value: "public",
      },
    ];
    const options = orderedOptions.map((option) => ({
      value: option.value,
      surfaceClassName: option.surfaceClassName,
      indicatorClassName: option.indicatorClassName,
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <Icon
            as={option.icon}
            className={cn(
              "size-3.5 text-text-muted",
              selected && (option.selectedIconClassName ?? "text-brand"),
            )}
          />
          <Text
            className={cn(
              "text-xs font-semibold text-text",
              selected && (option.selectedTextClassName ?? "text-brand"),
            )}
          >
            {option.label}
          </Text>
        </>
      ),
      visibility: option.visibility,
      selectedAccessTarget: option.selectedAccessTarget,
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, []);

  return (
    <SlidingOptionSelector
      rows={rows}
      value={selectorValue}
      onChange={(nextValue) => {
        const nextOption = rows.flat().find((option) => option.value === nextValue);
        if (!nextOption) return;
        onChange(nextOption.visibility, nextOption.selectedAccessTarget);
      }}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="gap-1.5 rounded-full px-2"
      indicatorClassName={
        rows.flat().find((option) => option.value === selectorValue)?.indicatorClassName ??
        "rounded-full border border-brand bg-brand-lighter"
      }
    />
  );
}

function AccentSelector({
  value,
  onChange,
}: {
  value: WishlistFormValues["accent"];
  onChange: (accent: WishlistFormValues["accent"]) => void;
}) {
  const rows = React.useMemo(() => {
    const options = WISHLIST_ACCENT_OPTIONS.map((option) => ({
      value: option.value,
      accessibilityLabel: `Use ${option.label} accent`,
      surfaceClassName: "bg-transparent",
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View className={cn("size-4 rounded-full", getWishlistAccentClass(option.value))} />
          <Text
            className={cn("text-sm font-semibold text-text-muted", selected && "text-brand")}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </>
      ),
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, []);

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

function EventDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed" || !selectedDate) return;

    onChange(formatDateFieldValue(selectedDate));
  }

  function handleOpenPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        display: "calendar",
        onChange: handleDateChange,
      });
      return;
    }

    setIosPickerOpen((open) => !open);
  }

  return (
    <View className="gap-2">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Select event date"
        onPress={handleOpenPicker}
        className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle px-3"
      >
        <Icon as={CalendarDays} className="size-4 text-text-muted" />
        <View className="min-w-0 flex-1">
          <Text className={cn("font-semibold", value ? "text-text" : "text-text-muted")}>
            {formatDateFieldLabel(value)}
          </Text>
          {value ? <Text className="text-xs font-semibold text-text-muted">{value}</Text> : null}
        </View>
        {value ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Clear event date"
            onPress={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            className="size-8 items-center justify-center rounded-full bg-bg-muted"
          >
            <Icon as={X} className="size-3.5 text-text-muted" />
          </AnimatedPressable>
        ) : null}
      </AnimatedPressable>

      {Platform.OS === "ios" && iosPickerOpen ? (
        <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-subtle">
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      ) : null}
    </View>
  );
}

function WishlistAccessPicker({
  title,
  options,
  selected,
  onChange,
  isLoading,
  isError,
  emptyLabel,
  errorLabel,
  existingAccess = [],
  existingAccessTitle,
  existingAccessEmptyLabel,
  onRevokeAccess,
  revokingTargetId,
  searchPlaceholder = "Search friends",
}: {
  title: string;
  options: WishlistAccessOption[];
  selected: WishlistAccessOption[];
  onChange: (options: WishlistAccessOption[]) => void;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  errorLabel: string;
  existingAccess?: WishlistAccessUser[];
  existingAccessTitle?: string;
  existingAccessEmptyLabel?: string;
  onRevokeAccess?: (targetId: string) => void;
  revokingTargetId?: string | null;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const selectedIds = React.useMemo(() => new Set(selected.map((item) => item.id)), [selected]);
  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 3) return options;
    return options.filter((option) => option.nickname.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  function toggleOption(option: WishlistAccessOption) {
    if (selectedIds.has(option.id)) {
      onChange(selected.filter((item) => item.id !== option.id));
      return;
    }

    onChange([...selected, option]);
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm font-bold text-text">{title}</Text>
        {selected.length > 0 ? (
          <View className="rounded-full bg-brand-lighter px-2 py-1">
            <Text className="text-xs font-bold text-brand">{selected.length} selected</Text>
          </View>
        ) : null}
      </View>

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        autoCapitalize="none"
      />

      <View className="gap-2">
        {isLoading ? (
          <Text className="rounded-lg bg-bg-muted p-3 text-sm font-semibold text-text-muted">
            Loading...
          </Text>
        ) : null}
        {!isLoading && isError ? (
          <Text className="rounded-lg bg-bg-muted p-3 text-sm font-semibold text-destructive">
            {errorLabel}
          </Text>
        ) : null}
        {!isLoading && !isError && filteredOptions.length === 0 ? (
          <Text className="rounded-lg bg-bg-muted p-3 text-sm font-semibold text-text-muted">
            {emptyLabel}
          </Text>
        ) : null}
        {!isLoading && !isError
          ? filteredOptions.map((option) => {
              const active = selectedIds.has(option.id);

              return (
                <Button
                  key={option.id}
                  variant="ghost"
                  className={cn(
                    "min-h-12 justify-start rounded-lg border border-border-subtle bg-bg-elevated px-3",
                    active && "border-brand bg-brand-lighter",
                  )}
                  onPress={() => toggleOption(option)}
                >
                  <View className="size-8 items-center justify-center rounded-full bg-bg-muted">
                    <Text className="text-xs font-extrabold text-text-muted">
                      {option.nickname[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <Text className={cn("min-w-0 flex-1 font-semibold", active && "text-brand")}>
                    {option.nickname}
                  </Text>
                  {active ? <Icon as={Check} className="size-4 text-brand" /> : null}
                </Button>
              );
            })
          : null}
      </View>

      {existingAccessTitle ? (
        <View className="gap-2 border-t border-border-subtle pt-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-xs font-bold uppercase text-text-muted">
              {existingAccessTitle}
            </Text>
            {existingAccess.length > 0 ? (
              <Text className="text-xs font-bold text-text-muted">{existingAccess.length}</Text>
            ) : null}
          </View>

          {existingAccess.length === 0 ? (
            <Text className="rounded-lg bg-bg-muted p-3 text-sm font-semibold text-text-muted">
              {existingAccessEmptyLabel}
            </Text>
          ) : (
            <View className="gap-2">
              {existingAccess.map((target) => {
                const revokeTargetId = target.group_id ?? target.id;
                const revoking = revokingTargetId === revokeTargetId;

                return (
                  <View
                    key={`${target.target_type ?? "user"}-${revokeTargetId}`}
                    className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-3"
                  >
                    <View className="size-8 items-center justify-center rounded-full bg-bg-muted">
                      <Text className="text-xs font-extrabold text-text-muted">
                        {target.nickname[0]?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <Text className="min-w-0 flex-1 font-semibold text-text">
                      {target.nickname}
                    </Text>
                    {onRevokeAccess ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        disabled={revoking}
                        accessibilityLabel={`Remove access for ${target.nickname}`}
                        onPress={() => onRevokeAccess(revokeTargetId)}
                      >
                        {revoking ? (
                          <ActivityIndicator colorClassName="accent-text-muted" />
                        ) : (
                          <Icon as={X} className="size-4 text-text-muted" />
                        )}
                      </Button>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-text">{label}</Text>
      {children}
    </View>
  );
}
