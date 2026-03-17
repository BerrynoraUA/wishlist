import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import type { DiscoverSection, ReservedItem } from "@/api/types/wishlist";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

type Tab = "friends" | "reserved";

function DiscoverCard({ section }: { section: DiscoverSection }) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() =>
          section.friend_id &&
          router.push({
            pathname: "/friends/[id]",
            params: { id: section.friend_id },
          })
        }
      >
        {section.avatar_url ? (
          <Image
            source={{ uri: section.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {section.owner?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionOwner}>{section.owner}</Text>
          <Text style={styles.sectionWishlist} numberOfLines={1}>
            {section.wishlist}
          </Text>
        </View>
      </TouchableOpacity>

      {section.items.slice(0, 3).map((item) => (
        <View key={item.id} style={styles.itemRow}>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.price != null && (
              <Text style={styles.itemPrice}>${item.price}</Text>
            )}
          </View>
          {item.isReserved && (
            <View style={styles.reservedBadge}>
              <Text style={styles.reservedText}>Reserved</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ReservedCard({ item }: { item: ReservedItem }) {
  return (
    <TouchableOpacity
      style={styles.reservedCard}
      onPress={() =>
        router.push({
          pathname: "/wishlist/[id]",
          params: { id: item.wishlist_id },
        })
      }
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.reservedImage} />
      ) : null}
      <View style={styles.reservedInfo}>
        <Text style={styles.reservedTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.reservedOwner} numberOfLines={1}>
          For {item.owner_name} • {item.wishlist_title}
        </Text>
        {item.price != null && (
          <Text style={styles.reservedPrice}>${item.price}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [tab, setTab] = useState<Tab>("friends");
  const [refreshing, setRefreshing] = useState(false);
  const discover = useFriendsWishlistsDiscover();
  const reserved = useFriendsWishlistsReservedByMe();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (tab === "friends") {
      await discover.refetch();
    } else {
      await reserved.refetch();
    }
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "friends" && styles.tabActive]}
            onPress={() => setTab("friends")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "friends" && styles.tabTextActive,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "reserved" && styles.tabActive]}
            onPress={() => setTab("reserved")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "reserved" && styles.tabTextActive,
              ]}
            >
              Reserved
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "friends" ? (
        <FlatList
          data={discover.data as DiscoverSection[] | undefined}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DiscoverCard section={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !discover.isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyText}>
                  Add friends to discover their wishlists
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={reserved.data}
          keyExtractor={(item) => item.item_id}
          renderItem={({ item }) => <ReservedCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !reserved.isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={styles.emptyTitle}>No reserved items</Text>
                <Text style={styles.emptyText}>
                  Items you reserve from friends will appear here
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  tabActive: { backgroundColor: Colors.background },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: Colors.text },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  // Section card
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.primary },
  sectionInfo: { marginLeft: Spacing.md, flex: 1 },
  sectionOwner: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  sectionWishlist: { fontSize: FontSize.sm, color: Colors.textSecondary },
  // Item row
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  itemImage: { width: 40, height: 40, borderRadius: BorderRadius.sm },
  itemInfo: { flex: 1, marginLeft: Spacing.md },
  itemTitle: { fontSize: FontSize.sm, color: Colors.text },
  itemPrice: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  reservedBadge: {
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  reservedText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600" },
  // Reserved card
  reservedCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  reservedImage: { width: 80, height: 80 },
  reservedInfo: { flex: 1, padding: Spacing.md, justifyContent: "center" },
  reservedTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  reservedOwner: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reservedPrice: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  // Empty
  empty: { alignItems: "center", paddingVertical: Spacing.xxxl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: "center" },
});
