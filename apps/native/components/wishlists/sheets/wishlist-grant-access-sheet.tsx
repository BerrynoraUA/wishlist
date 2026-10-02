import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PeoplePickerField, type PeoplePickerItem } from "@/components/ui/people-picker";
import { Text } from "@/components/ui/text";
import { MascotEmptyState } from "@/components/shared/mascot-empty-state";
import {
  useInfiniteFriendsWithoutWishlistAccess,
  useWishlistAccessList,
} from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useProGate } from "@/hooks/use-pro-gate";
import { useGrantWishlistAccess, useRevokeWishlistAccess } from "@/hooks/use-wishlists";
import type { ProfileSearchResult } from "@wishlist/backend/types/friends";
import { Check, Lock, Shield, SquarePen, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";

type GrantAccessFormValues = {
  query: string;
  selectedFriend: ProfileSearchResult | null;
  accessType: 0 | 1;
};

const FRIENDS_PAGE_SIZE = 20;

function toPickerItem(friend: ProfileSearchResult): PeoplePickerItem {
  return {
    id: friend.id,
    name: friend.display_name || `@${friend.nickname}`,
    subtitle: friend.display_name ? `@${friend.nickname}` : null,
    avatarUrl: friend.avatar_url,
  };
}

export function WishlistGrantAccessSheet({
  open,
  wishlistId,
  wishlistTitle,
  onOpenChange,
}: {
  open: boolean;
  wishlistId: string;
  wishlistTitle: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { isGated, openPaywall } = useProGate();
  const { control, handleSubmit, reset, setValue } = useForm<GrantAccessFormValues>({
    defaultValues: {
      query: "",
      selectedFriend: null,
      accessType: 0,
    },
  });
  const values = useWatch({ control }) as GrantAccessFormValues;
  const deferredQuery = React.useDeferredValue(values.query);
  const friendsQuery = useInfiniteFriendsWithoutWishlistAccess(
    { wishlistId, search: deferredQuery },
    FRIENDS_PAGE_SIZE,
    { enabled: open && !isGated },
  );
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const accessListQuery = useWishlistAccessList(wishlistId, { enabled: open && !isGated });
  const grantAccess = useGrantWishlistAccess();
  const revokeAccess = useRevokeWishlistAccess();
  const friendItems = React.useMemo<PeoplePickerItem[]>(
    () => friends.map(toPickerItem),
    [friends],
  );
  // The picked friend stays shown even once a new search filters it out of `friends`.
  const selectedItems = values.selectedFriend ? [toPickerItem(values.selectedFriend)] : [];

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  if (!open) return null;

  const accessList = accessListQuery.data ?? [];

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function submitForm(formValues: GrantAccessFormValues) {
    if (!formValues.selectedFriend) return;

    grantAccess.mutate(
      {
        wishlistId,
        grantedToUserId: formValues.selectedFriend.id,
        accessType: formValues.accessType,
      },
      {
        onSuccess: handleClose,
      },
    );
  }

  if (isGated) {
    return (
      <BottomSheet
        ref={sheetRef}
        onDidDismiss={() => onOpenChange(false)}
        header={<BottomSheetHeader title={t("Collaborative wishlists")} />}
        footer={
          <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
            <Button className="min-w-0 flex-1" variant="outline" onPress={handleClose}>
              <Text>{t("Cancel")}</Text>
            </Button>
            <Button className="min-w-0 flex-1" onPress={openPaywall}>
              <Icon as={Lock} className="size-4 text-primary-foreground" />
              <Text>{t("Upgrade to Pro")}</Text>
            </Button>
          </View>
        }
      >
        <View className="items-center gap-4 px-5">
          <View className="size-14 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={Lock} className="size-6 text-brand" />
          </View>
          <Text className="text-center text-sm text-text-muted">
            {t("Granting view or edit access to other people is available only on the Pro plan.")}
          </Text>
          <View className="w-full gap-1 rounded-xl border border-border-subtle bg-bg-subtle p-3">
            <Text className="text-xs font-bold uppercase text-text-muted">{t("Wishlist")}</Text>
            <Text className="font-extrabold text-text">{wishlistTitle}</Text>
          </View>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      onDidDismiss={() => onOpenChange(false)}
      header={<BottomSheetHeader title={t("Grant access")} />}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button className="min-w-0 flex-1" variant="outline" onPress={handleClose}>
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={!values.selectedFriend || grantAccess.isPending}
            onPress={handleSubmit(submitForm)}
          >
            {grantAccess.isPending ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : null}
            <Text>{t("Confirm access")}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-5 px-5">
        <View className="gap-2 rounded-xl border border-border-subtle bg-bg-subtle p-3">
          <Text className="text-xs font-bold uppercase text-text-muted">{t("Wishlist")}</Text>
          <Text className="text-base font-extrabold text-text">{wishlistTitle}</Text>
        </View>

        <PeoplePickerField
          single
          label={t("Choose a friend")}
          title={t("Choose a friend")}
          addLabel={t("Choose a friend")}
          items={friendItems}
          selected={selectedItems}
          onChange={(next) => {
            const picked = next[0];
            setValue(
              "selectedFriend",
              picked ? (friends.find((friend) => friend.id === picked.id) ?? null) : null,
            );
          }}
          query={values.query}
          onQueryChange={(query) => setValue("query", query)}
          searchPlaceholder={t("Search among your friends")}
          isLoading={friendsQuery.isLoading}
          isError={friendsQuery.isError}
          isFetchingMore={friendsQuery.isFetchingNextPage}
          onEndReached={loadMoreFriends}
          emptyLabel={t("No matching friends found.")}
        />

        <View className="gap-3">
          <Text className="text-sm font-bold text-text">{t("Access level")}</Text>
          <View className="gap-2">
            <AccessButton
              title={t("View access")}
              description={t("Can open and follow updates.")}
              active={values.accessType === 0}
              icon={Shield}
              onPress={() => setValue("accessType", 0)}
            />
            <AccessButton
              title={t("Edit access")}
              description={t("Can add and manage items.")}
              active={values.accessType === 1}
              icon={SquarePen}
              onPress={() => setValue("accessType", 1)}
            />
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-bold text-text">{t("People with access")}</Text>
          <View className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg">
            {accessListQuery.isLoading ? (
              <View className="items-center p-4">
                <ActivityIndicator colorClassName="accent-brand" />
              </View>
            ) : accessList.length === 0 ? (
              <MascotEmptyState
                compact
                variant="holding-key"
                message={t("No one has access yet.")}
              />
            ) : (
              accessList.map((user) => (
                <View
                  key={`${user.id}-${user.access_type}`}
                  className="flex-row items-center justify-between gap-3 border-b border-border-subtle p-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-text" numberOfLines={1}>
                      @{user.nickname}
                    </Text>
                    <Text className="text-xs font-semibold text-text-muted">
                      {user.access_role === "editor" ? t("Editor") : t("Viewer")}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={revokeAccess.isPending}
                    onPress={() => revokeAccess.mutate({ wishlistId, targetUserId: user.id })}
                  >
                    <Icon as={X} className="size-4 text-destructive" />
                  </Button>
                </View>
              ))
            )}
          </View>
        </View>

        {grantAccess.error || revokeAccess.error ? (
          <Text className="text-sm font-semibold text-destructive">
            {(grantAccess.error ?? revokeAccess.error)?.message}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function AccessButton({
  title,
  description,
  active,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  active: boolean;
  icon: typeof Shield;
  onPress: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      onPress={onPress}
      className="h-auto justify-start rounded-xl p-4"
    >
      <Icon as={icon} className={active ? "size-4 text-primary-foreground" : "size-4 text-text"} />
      <View className="min-w-0 flex-1">
        <Text
          className={active ? "font-extrabold text-primary-foreground" : "font-extrabold text-text"}
        >
          {title}
        </Text>
        <Text className={active ? "text-xs text-primary-foreground/80" : "text-xs text-text-muted"}>
          {description}
        </Text>
      </View>
      {active ? <Icon as={Check} className="size-4 text-primary-foreground" /> : null}
    </Button>
  );
}
