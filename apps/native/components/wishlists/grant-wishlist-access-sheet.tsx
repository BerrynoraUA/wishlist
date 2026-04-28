import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useFriendsWithoutWishlistAccess, useWishlistAccessList } from "@/hooks/use-friends";
import { useGrantWishlistAccess, useRevokeWishlistAccess } from "@/hooks/use-wishlists";
import type { ProfileSearchResult } from "@/types/friends";
import { Check, Search, Shield, SquarePen, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function GrantWishlistAccessSheet({
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
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [query, setQuery] = React.useState("");
  const [selectedFriend, setSelectedFriend] = React.useState<ProfileSearchResult | null>(null);
  const [accessType, setAccessType] = React.useState<0 | 1>(0);
  const friendsQuery = useFriendsWithoutWishlistAccess({
    wishlistId,
    search: query,
    skip: 0,
    take: 100,
  });
  const accessListQuery = useWishlistAccessList(wishlistId);
  const grantAccess = useGrantWishlistAccess();
  const revokeAccess = useRevokeWishlistAccess();

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedFriend(null);
      setAccessType(0);
    }
  }, [open]);

  if (!open) return null;

  const friends = friendsQuery.data ?? [];
  const accessList = accessListQuery.data ?? [];

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function handleGrant() {
    if (!selectedFriend) return;

    grantAccess.mutate(
      {
        wishlistId,
        grantedToUserId: selectedFriend.id,
        accessType,
      },
      {
        onSuccess: handleClose,
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[0.82, 1]}
      scrollable
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
      header={<Text className="mx-5 mt-5 text-lg font-extrabold text-text">Grant access</Text>}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button className="min-w-0 flex-1" variant="outline" onPress={handleClose}>
            <Text>Cancel</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={!selectedFriend || grantAccess.isPending}
            onPress={handleGrant}
          >
            {grantAccess.isPending ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : null}
            <Text>Confirm access</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-5 px-5 pt-5">
        <View className="gap-2 rounded-xl border border-border-subtle bg-bg-subtle p-3">
          <Text className="text-xs font-bold uppercase text-text-muted">Wishlist</Text>
          <Text className="text-base font-extrabold text-text">{wishlistTitle}</Text>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-bold text-text">Choose a friend</Text>
          {selectedFriend ? (
            <View className="flex-row items-center justify-between rounded-xl border border-brand bg-brand-lighter p-3">
              <View>
                <Text className="font-extrabold text-text">@{selectedFriend.nickname}</Text>
                <Text className="text-xs font-semibold text-text-muted">Ready to grant access</Text>
              </View>
              <Button variant="outline" size="sm" onPress={() => setSelectedFriend(null)}>
                <Text>Change</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
                <Icon as={Search} className="size-4 text-text-muted" />
                <Input
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search among your friends"
                  className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none"
                />
              </View>
              <View className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg">
                {friendsQuery.isLoading ? (
                  <View className="items-center p-4">
                    <ActivityIndicator colorClassName="accent-brand" />
                  </View>
                ) : friends.length === 0 ? (
                  <Text className="p-4 text-sm font-semibold text-text-muted">
                    No matching friends found.
                  </Text>
                ) : (
                  friends.map((friend) => (
                    <Button
                      key={friend.id}
                      variant="ghost"
                      className="justify-start rounded-none border-b border-border-subtle px-4"
                      onPress={() => setSelectedFriend(friend)}
                    >
                      <Text>@{friend.nickname}</Text>
                    </Button>
                  ))
                )}
              </View>
            </>
          )}
        </View>

        <View className="gap-3">
          <Text className="text-sm font-bold text-text">Access level</Text>
          <View className="gap-2">
            <AccessButton
              title="View access"
              description="Can open and follow updates."
              active={accessType === 0}
              icon={Shield}
              onPress={() => setAccessType(0)}
            />
            <AccessButton
              title="Edit access"
              description="Can add and manage items."
              active={accessType === 1}
              icon={SquarePen}
              onPress={() => setAccessType(1)}
            />
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-bold text-text">People with access</Text>
          <View className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg">
            {accessListQuery.isLoading ? (
              <View className="items-center p-4">
                <ActivityIndicator colorClassName="accent-brand" />
              </View>
            ) : accessList.length === 0 ? (
              <Text className="p-4 text-sm font-semibold text-text-muted">
                No one has access yet.
              </Text>
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
                      {user.access_role === "editor" ? "Editor" : "Viewer"}
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
