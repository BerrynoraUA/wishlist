import { Text } from "@/components/ui/text";
import { WishlistDetailHeader } from "@/components/wishlists/wishlist-detail-header";
import { useWishlistById } from "@/hooks/use-wishlists";
import { Stack, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

export default function WishlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const wishlistId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const query = useWishlistById(wishlistId);
  const wishlist = query.data;

  return (
    <>
      <Stack.Screen options={{ title: wishlist?.title ?? "Wishlist" }} />
      <View className="flex-1 bg-bg">
        {query.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : query.isError || !wishlist ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm font-semibold text-text-muted">
              Failed to load wishlist.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
            <WishlistDetailHeader
              wishlist={wishlist}
              canEdit={wishlist.is_owner || wishlist.can_edit}
              isOwner={wishlist.is_owner}
            />
          </ScrollView>
        )}
      </View>
    </>
  );
}
