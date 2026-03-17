import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useMyWishlists,
  useCreateWishlist,
  useDeleteWishlist,
} from "@/hooks/use-wishlists";
import { useMyStatistics } from "@/hooks/use-user";
import { useProfile } from "@/hooks/use-settings";
import type { Wishlist } from "@/types/wishlist";
import { WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  ACCENT_COLORS,
} from "@/constants/theme";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WishlistCard({ item }: { item: Wishlist }) {
  const accentColor = ACCENT_COLORS[item.accent_type] || Colors.accentPink;

  return (
    <TouchableOpacity
      style={[styles.wishlistCard, { borderLeftColor: accentColor }]}
      onPress={() =>
        router.push({
          pathname: "/wishlist/[id]",
          params: { id: item.id },
        })
      }
      activeOpacity={0.7}
    >
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.wishlistImage}
        />
      )}
      <View style={styles.wishlistContent}>
        <Text style={styles.wishlistTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.wishlistDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.wishlistMeta}>
          <Text style={styles.wishlistItems}>
            {item.itemsCount ?? 0} items
          </Text>
          <View
            style={[styles.visibilityBadge, { backgroundColor: accentColor + "20" }]}
          >
            <Text style={[styles.visibilityText, { color: accentColor }]}>
              {item.visibility_type === WishlistVisibility.Public
                ? "Public"
                : item.visibility_type === WishlistVisibility.FriendsOnly
                ? "Friends"
                : "Private"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { data: wishlists, isLoading, refetch } = useMyWishlists();
  const { data: stats } = useMyStatistics();
  const { data: profile } = useProfile();
  const createWishlist = useCreateWishlist();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateWishlist = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    try {
      await createWishlist.mutateAsync({ title: newTitle.trim() });
      setNewTitle("");
      setShowCreateModal(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create wishlist");
    }
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          Hi, {profile?.display_name || "there"} 👋
        </Text>
        <Text style={styles.greetingSubtext}>Manage your wishlists</Text>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Wishlists" value={stats.wishlists_count} />
          <StatCard label="Items" value={stats.total_items_count} />
          <StatCard label="Reserved" value={stats.reserved_items_count} />
        </View>
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>+ New Wishlist</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={wishlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WishlistCard item={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎁</Text>
              <Text style={styles.emptyTitle}>No wishlists yet</Text>
              <Text style={styles.emptyText}>
                Create your first wishlist to get started!
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Wishlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wishlist title"
              placeholderTextColor={Colors.textTertiary}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTitle("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreate,
                  createWishlist.isPending && styles.buttonDisabled,
                ]}
                onPress={handleCreateWishlist}
                disabled={createWishlist.isPending}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerSection: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    marginBottom: Spacing.xl,
  },
  greetingText: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
  },
  greetingSubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  wishlistCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: Spacing.md,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  wishlistImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  wishlistContent: {
    padding: Spacing.lg,
  },
  wishlistTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
  },
  wishlistDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  wishlistMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  wishlistItems: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  visibilityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  visibilityText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 16,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalCancel: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  modalCreate: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  modalCreateText: {
    fontSize: FontSize.md,
    color: Colors.textInverse,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
