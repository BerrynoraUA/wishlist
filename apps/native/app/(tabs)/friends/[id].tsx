import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { Icon } from "@/components/ui/icon";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { useRemoveFriend } from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useInfiniteFriendWishlists } from "@/hooks/use-wishlists";
import { chunkRows } from "@/lib/layout";
import {
  WISHLIST_PAGE_SIZE,
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentClass,
  getWishlistVisibilityLabels,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Gift, UserMinus } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FriendWishlistsScreen() {
  const t = useGT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const friendId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const wishlistsQuery = useInfiniteFriendWishlists(friendId, {}, WISHLIST_PAGE_SIZE);
  const removeFriend = useRemoveFriend();
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const { items: wishlists, loadMore: loadMoreWishlists } = useInfiniteListData(wishlistsQuery);
  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const rows = React.useMemo(() => chunkRows(wishlists, columns), [columns, wishlists]);

  function handleRemoveFriend() {
    removeFriend.mutate(friendId, {
      onSuccess: () => router.replace("/friends" as never),
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: t("Friend's Wishlists") }} />
      <View className="flex-1 bg-bg">
        <StyledFlashList
          data={wishlistsQuery.isLoading || wishlistsQuery.isError ? [] : rows}
          renderItem={({ item }: { item: Wishlist[] }) => (
            <View
              className="flex-row"
              style={{
                alignSelf: "center",
                gap: gridGap,
                width: contentWidth,
              }}
            >
              {item.map((wishlist) => (
                <View key={wishlist.id} style={{ width: cardWidth }}>
                  <FriendWishlistCard
                    wishlist={wishlist}
                    width={cardWidth}
                    onPress={() => router.push(`/friends/wishlist/${wishlist.id}` as never)}
                  />
                </View>
              ))}
            </View>
          )}
          keyExtractor={(row: Wishlist[]) => row.map((wishlist) => wishlist.id).join(":")}
          className="flex-1"
          contentContainerClassName="pb-8"
          contentContainerStyle={{ paddingTop: insets.top + 24 }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          onEndReached={loadMoreWishlists}
          isLoadingMore={wishlistsQuery.isFetchingNextPage}
          ListHeaderComponent={
            <View className="gap-5 self-center pb-5" style={{ width: contentWidth }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-2xl font-extrabold text-text">
                    {t("Friend's Wishlists")}
                  </Text>
                  <Text className="text-sm font-semibold text-text-muted">
                    {wishlists.length === 1
                      ? t("{count} wishlist", { count: wishlists.length })
                      : t("{count} wishlists", { count: wishlists.length })}
                  </Text>
                </View>
                <Button
                  variant="destructive"
                  onPress={() => setRemoveOpen(true)}
                  className="rounded-full"
                >
                  <Icon as={UserMinus} className="size-4 text-white" />
                  <Text>{t("Remove")}</Text>
                </Button>
              </View>
            </View>
          }
          ListFooterComponent={
            <View className="self-center" style={{ width: contentWidth }}>
              {wishlistsQuery.isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null}
              {wishlistsQuery.isError ? (
                <Text className="text-center text-sm font-semibold text-destructive">
                  {t("Failed to load wishlists.")}
                </Text>
              ) : null}
              {!wishlistsQuery.isLoading && !wishlistsQuery.isError && wishlists.length === 0 ? (
                <Text className="text-center text-sm font-semibold text-text-muted">
                  {t("This friend has no visible wishlists.")}
                </Text>
              ) : null}
            </View>
          }
          extraData={{ cardWidth, contentWidth, gridGap }}
        />

        <FloatingBackButton />

        <RemoveFriendSheet
          open={removeOpen}
          isPending={removeFriend.isPending}
          error={removeFriend.error?.message}
          onOpenChange={setRemoveOpen}
          onConfirm={handleRemoveFriend}
        />
      </View>
    </>
  );
}

function FriendWishlistCard({
  wishlist,
  onPress,
}: {
  wishlist: Wishlist;
  width: number;
  onPress: () => void;
}) {
  const t = useGT();
  const visibilityLabels = React.useMemo(() => getWishlistVisibilityLabels(t), [t]);
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[wishlist.visibility_type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Open "{title}"', { title: wishlist.title })}
      onPress={onPress}
      className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm active:scale-[0.99]"
    >
      <View className="h-30 items-center justify-center overflow-hidden">
        <View className={cn("absolute inset-0", getWishlistAccentClass(wishlist.accent_type))} />
        {wishlist.image_url ? (
          <StyledImage
            source={{ uri: wishlist.image_url }}
            contentFit="cover"
            className="absolute inset-0 size-full"
          />
        ) : (
          <Icon as={Gift} className="size-10 text-white/85" />
        )}
        <View className="absolute inset-0 bg-black/10" />
      </View>

      <View className="gap-3 px-4 pb-4 pt-3">
        <Text className="min-h-10 text-[15px] font-bold leading-5 text-text" numberOfLines={2}>
          {wishlist.title}
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-semibold text-text-muted">
            {(wishlist.items_count ?? 0) === 1
              ? t("1 item")
              : t("{count} items", { count: wishlist.items_count ?? 0 })}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Icon as={VisibilityIcon} className="size-3.5 text-text-muted" />
            <Text className="text-sm font-semibold text-text-muted">
              {visibilityLabels[wishlist.visibility_type]}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RemoveFriendSheet({
  open,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
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
          <Text className="text-lg font-extrabold text-text">{t("Remove Friend")}</Text>
          <Text className="text-sm text-text-muted">
            {t(
              "Are you sure you want to remove this friend? You will need to send a new friend request to reconnect.",
            )}
          </Text>
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
            <Text>{t("Remove Friend")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
