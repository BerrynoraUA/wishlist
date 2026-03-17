import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  useFriends,
  useIncomingFriendRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useSearchProfilesByNickname,
  useSendFriendRequest,
} from "@/hooks/use-friends";
import type { FriendWithDetails, FriendRequestWithDetails } from "@/api/types/friends";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

type Tab = "friends" | "requests" | "search";

function FriendCard({ friend }: { friend: FriendWithDetails }) {
  return (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() =>
        router.push({ pathname: "/friends/[id]", params: { id: friend.friend_id } })
      }
    >
      {friend.avatar_url ? (
        <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {friend.display_name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.display_name}</Text>
        {friend.nickname && (
          <Text style={styles.friendNickname}>@{friend.nickname}</Text>
        )}
        <Text style={styles.friendMeta}>
          {friend.wishlists_count} wishlists • {friend.mutual_friends_count} mutual
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RequestCard({ request }: { request: FriendRequestWithDetails }) {
  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();

  return (
    <View style={styles.requestCard}>
      {request.avatar_url ? (
        <Image source={{ uri: request.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {request.display_name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}
      <View style={styles.requestInfo}>
        <Text style={styles.friendName}>{request.display_name}</Text>
        {request.nickname && (
          <Text style={styles.friendNickname}>@{request.nickname}</Text>
        )}
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => accept.mutate(request.id)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => reject.mutate(request.id)}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FriendsScreen() {
  const [tab, setTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const friends = useFriends();
  const incoming = useIncomingFriendRequests();
  const searchResults = useSearchProfilesByNickname(searchQuery);
  const sendRequest = useSendFriendRequest();

  const handleRefresh = async () => {
    setRefreshing(true);
    await friends.refetch();
    await incoming.refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.tabs}>
          {(["friends", "requests", "search"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "friends"
                  ? "Friends"
                  : t === "requests"
                  ? `Requests${incoming.data?.length ? ` (${incoming.data.length})` : ""}`
                  : "Search"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === "search" && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by nickname..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      )}

      {tab === "friends" && (
        <FlatList
          data={friends.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FriendCard friend={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !friends.isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptyText}>
                  Search for people to connect with
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {tab === "requests" && (
        <FlatList
          data={incoming.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard request={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !incoming.isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📬</Text>
                <Text style={styles.emptyTitle}>No pending requests</Text>
              </View>
            ) : null
          }
        />
      )}

      {tab === "search" && (
        <FlatList
          data={searchResults.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.searchResult}>
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.nickname?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <Text style={styles.searchNickname}>@{item.nickname}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => sendRequest.mutate(item.id)}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery.trim() && !searchResults.isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results found</Text>
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
  tabText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: Colors.text },
  searchBar: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  // Friend card
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.primary },
  friendInfo: { flex: 1, marginLeft: Spacing.md },
  friendName: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  friendNickname: { fontSize: FontSize.sm, color: Colors.textSecondary },
  friendMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  // Request card
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  requestInfo: { flex: 1, marginLeft: Spacing.md },
  requestActions: { flexDirection: "row", gap: Spacing.sm },
  acceptButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  acceptText: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.textInverse },
  rejectButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  rejectText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  // Search result
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchNickname: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addButtonText: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.textInverse },
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
