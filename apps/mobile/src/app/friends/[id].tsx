import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useFriendWishlists } from "@/hooks/use-wishlists";
import { useCheckFriendship, useRemoveFriend } from "@/hooks/use-friends";
import type { Wishlist } from "@/types/wishlist";
import { Colors, Spacing, FontSize, BorderRadius, ACCENT_COLORS } from "@/constants/theme";

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: profiles } = useProfilesByIds(id ? [id] : []);
  const { data: wishlists, refetch } = useFriendWishlists(id || "");
  const { data: friendship } = useCheckFriendship(id || "");
  const removeFriend = useRemoveFriend();
  const [refreshing, setRefreshing] = useState(false);

  const profile = profiles?.[0];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRemoveFriend = () => {
    Alert.alert("Remove Friend", `Remove ${profile?.display_name || "this friend"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeFriend.mutate(id!, { onSuccess: () => router.back() });
        },
      },
    ]);
  };

  const headerComponent = (
    <View style={styles.profileHeader}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}
      <Text style={styles.displayName}>{profile?.display_name || "—"}</Text>
      {profile?.nickname && (
        <Text style={styles.nickname}>@{profile.nickname}</Text>
      )}
      {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      <View style={styles.actionRow}>
        {friendship && (
          <TouchableOpacity
            style={styles.removeFriendButton}
            onPress={handleRemoveFriend}
          >
            <Text style={styles.removeFriendText}>Remove Friend</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>
        Wishlists ({wishlists?.length ?? 0})
      </Text>
    </View>
  );

  const renderWishlist = ({ item }: { item: Wishlist }) => {
    const accentColor = ACCENT_COLORS[item.accent_type] || Colors.primary;
    return (
      <TouchableOpacity
        style={styles.wishlistCard}
        onPress={() => router.push(`/wishlist/${item.id}`)}
      >
        <View style={[styles.wishlistAccent, { backgroundColor: accentColor }]} />
        <View style={styles.wishlistContent}>
          <Text style={styles.wishlistTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.wishlistDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.wishlistMeta}>
            {item.itemsCount ?? 0} items
            {item.event_date &&
              ` · ${new Date(item.event_date).toLocaleDateString()}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={wishlists}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        renderItem={renderWishlist}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No wishlists to show</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: "600" },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  profileHeader: { alignItems: "center", paddingVertical: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: FontSize.xxxl, fontWeight: "700", color: Colors.primary },
  displayName: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  nickname: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  bio: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  actionRow: { flexDirection: "row", marginTop: Spacing.lg },
  removeFriendButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  removeFriendText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: "600" },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    alignSelf: "flex-start",
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  wishlistCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  wishlistAccent: { width: 5 },
  wishlistContent: { flex: 1, padding: Spacing.lg },
  wishlistTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  wishlistDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  wishlistMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.sm },
  empty: { alignItems: "center", paddingVertical: Spacing.xxxl },
  emptyTitle: { fontSize: FontSize.md, color: Colors.textSecondary },
});
