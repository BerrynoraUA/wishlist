import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  Image,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/providers/auth-provider";
import { useWishlistById, useUpdateWishlist, useDeleteWishlist } from "@/hooks/use-wishlists";
import {
  useWishlistItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useToggleItemReservation,
} from "@/hooks/use-items";
import type { Item } from "@/types/item";
import type { Wishlist } from "@/types/wishlist";
import { WishlistVisibility } from "@/types/wishlist";
import { Colors, Spacing, FontSize, BorderRadius, ACCENT_COLORS } from "@/constants/theme";

function VisibilityBadge({ type }: { type: WishlistVisibility }) {
  const labels: Record<WishlistVisibility, string> = {
    [WishlistVisibility.Public]: "Public",
    [WishlistVisibility.FriendsOnly]: "Friends",
    [WishlistVisibility.Private]: "Private",
  };
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{labels[type]}</Text>
    </View>
  );
}

function ItemCard({
  item,
  isOwner,
  onEdit,
  onDelete,
  onReserve,
}: {
  item: Item;
  isOwner: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onReserve: (id: string) => void;
}) {
  const isReserved = !!item.reserved_by;
  const hasDiscount = item.has_discount && item.discount_price;

  return (
    <View style={styles.itemCard}>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      )}
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.itemMeta}>
          {item.price && (
            <Text
              style={[styles.itemPrice, hasDiscount && styles.priceStrikethrough]}
            >
              ${item.price}
            </Text>
          )}
          {hasDiscount && (
            <Text style={styles.itemDiscountPrice}>${item.discount_price}</Text>
          )}
          {item.priority != null && item.priority > 0 && (
            <Text style={styles.itemPriority}>
              {"★".repeat(Math.min(item.priority, 5))}
            </Text>
          )}
        </View>

        <View style={styles.itemActions}>
          {item.url && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(item.url!)}
            >
              <Text style={styles.linkButtonText}>View</Text>
            </TouchableOpacity>
          )}
          {isOwner ? (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(item)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.reserveButton,
                isReserved && styles.reservedButton,
              ]}
              onPress={() => onReserve(item.id)}
            >
              <Text
                style={[
                  styles.reserveButtonText,
                  isReserved && styles.reservedButtonText,
                ]}
              >
                {isReserved ? "Reserved" : "Reserve"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

interface ItemFormData {
  name: string;
  description: string;
  price: string;
  url: string;
  priority: string;
  imageUri: string | null;
}

const EMPTY_FORM: ItemFormData = {
  name: "",
  description: "",
  price: "",
  url: "",
  priority: "",
  imageUri: null,
};

export default function WishlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: wishlist, refetch: refetchWishlist } = useWishlistById(id || "");
  const { data: items, refetch: refetchItems } = useWishlistItems(id || "");
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const toggleReservation = useToggleItemReservation();
  const updateWishlist = useUpdateWishlist();
  const deleteWishlist = useDeleteWishlist();

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemFormData>(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState(false);

  const isOwner = wishlist?.user_id === user?.id;
  const accentColor = wishlist
    ? ACCENT_COLORS[wishlist.accent_type] || Colors.primary
    : Colors.primary;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWishlist(), refetchItems()]);
    setRefreshing(false);
  };

  const openAddItem = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowItemModal(true);
  };

  const openEditItem = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price || "",
      url: item.url || "",
      priority: item.priority?.toString() || "",
      imageUri: null,
    });
    setShowItemModal(true);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setForm((prev) => ({ ...prev, imageUri: result.assets[0].uri }));
    }
  };

  const handleSaveItem = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Item name is required");
      return;
    }
    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        updates: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: form.price.trim() || null,
          url: form.url.trim() || null,
          priority: form.priority ? parseInt(form.priority, 10) : null,
          image_uri: form.imageUri,
        },
      });
    } else {
      await createItem.mutateAsync({
        wishlist_id: id!,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price.trim() || null,
        url: form.url.trim() || null,
        priority: form.priority ? parseInt(form.priority, 10) : null,
        image_uri: form.imageUri,
      });
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem.mutate(itemId),
      },
    ]);
  };

  const handleDeleteWishlist = () => {
    Alert.alert("Delete Wishlist", "This will delete the wishlist and all items.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteWishlist.mutate(id!, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  const headerComponent = wishlist ? (
    <View style={[styles.wishlistHeader, { borderBottomColor: accentColor }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.wishlistTitle}>{wishlist.title}</Text>
          {wishlist.description && (
            <Text style={styles.wishlistDescription}>{wishlist.description}</Text>
          )}
        </View>
        <VisibilityBadge type={wishlist.visibility_type} />
      </View>
      <View style={styles.headerMeta}>
        {wishlist.event_date && (
          <Text style={styles.eventDate}>
            📅 {new Date(wishlist.event_date).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.itemCount}>
          {items?.length ?? 0} item{(items?.length ?? 0) !== 1 ? "s" : ""}
        </Text>
      </View>
      {isOwner && (
        <View style={styles.ownerActions}>
          <TouchableOpacity
            style={[styles.addItemButton, { backgroundColor: accentColor }]}
            onPress={openAddItem}
          >
            <Text style={styles.addItemButtonText}>+ Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteWishlist}>
            <Text style={styles.deleteWishlistText}>Delete Wishlist</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            isOwner={isOwner}
            onEdit={openEditItem}
            onDelete={handleDeleteItem}
            onReserve={(itemId) => toggleReservation.mutate(itemId)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No items yet</Text>
            {isOwner && (
              <Text style={styles.emptyText}>
                Tap "+ Add Item" to add your first wish
              </Text>
            )}
          </View>
        }
      />

      {/* Add/Edit Item Modal */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? "Edit Item" : "Add Item"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Item name *"
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={Colors.textTertiary}
              value={form.description}
              onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Price"
                placeholderTextColor={Colors.textTertiary}
                value={form.price}
                onChangeText={(t) => setForm((p) => ({ ...p, price: t }))}
                keyboardType="decimal-pad"
              />
              <View style={{ width: Spacing.sm }} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Priority (1-5)"
                placeholderTextColor={Colors.textTertiary}
                value={form.priority}
                onChangeText={(t) => setForm((p) => ({ ...p, priority: t }))}
                keyboardType="number-pad"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="URL"
              placeholderTextColor={Colors.textTertiary}
              value={form.url}
              onChangeText={(t) => setForm((p) => ({ ...p, url: t }))}
              keyboardType="url"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
              <Text style={styles.imagePickerText}>
                {form.imageUri ? "📸 Image selected" : "📷 Pick Image"}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowItemModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: accentColor }]}
                onPress={handleSaveItem}
              >
                <Text style={styles.modalSaveText}>
                  {editingItem ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  wishlistHeader: {
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 3,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  wishlistTitle: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  wishlistDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  headerMeta: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: Spacing.md },
  eventDate: { fontSize: FontSize.sm, color: Colors.textSecondary },
  itemCount: { fontSize: FontSize.sm, color: Colors.textTertiary },
  ownerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },
  addItemButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addItemButtonText: { color: Colors.white, fontWeight: "600", fontSize: FontSize.md },
  deleteWishlistText: { fontSize: FontSize.sm, color: Colors.error },
  // Item Card
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemImage: { width: "100%", height: 160, backgroundColor: Colors.skeleton },
  itemContent: { padding: Spacing.lg },
  itemName: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  itemDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  itemMeta: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: Spacing.md },
  itemPrice: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  priceStrikethrough: { textDecorationLine: "line-through", color: Colors.textTertiary },
  itemDiscountPrice: { fontSize: FontSize.md, fontWeight: "700", color: Colors.error },
  itemPriority: { fontSize: FontSize.sm, color: Colors.warning },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  linkButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  linkButtonText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "600" },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  editButtonText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  deleteText: { fontSize: FontSize.sm, color: Colors.error },
  reserveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  reservedButton: { backgroundColor: Colors.backgroundSecondary },
  reserveButtonText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: "600" },
  reservedButtonText: { color: Colors.textSecondary },
  // Empty
  empty: { alignItems: "center", paddingVertical: Spacing.xxxl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
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
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text, marginBottom: Spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  formRow: { flexDirection: "row" },
  imagePickerButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  imagePickerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.md },
  modalCancel: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  modalCancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  modalSave: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalSaveText: { fontSize: FontSize.md, color: Colors.white, fontWeight: "600" },
});
