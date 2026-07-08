import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { FriendWithDetails } from "@wishlist/backend/types/friends";
import { UserMinus } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { Pressable, View } from "react-native";

function getInitials(friend: FriendWithDetails) {
  const source = friend.display_name || friend.nickname || "?";
  return source.slice(0, 1).toUpperCase();
}

export function FriendCard({
  friend,
  onOpen,
  onRemove,
}: {
  friend: FriendWithDetails;
  onOpen: (friendId: string) => void;
  onRemove: (friendId: string) => void;
}) {
  const t = useGT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Open friend")}
      onPress={() => onOpen(friend.friend_id)}
      className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm active:scale-[0.99]"
    >
      <Avatar className="size-12" alt={friend.display_name || friend.nickname || t("Friend")}>
        {friend.avatar_url ? <AvatarImage source={{ uri: friend.avatar_url }} /> : null}
        <AvatarFallback className="bg-brand-lighter">
          <Text className="text-base font-extrabold text-brand">{getInitials(friend)}</Text>
        </AvatarFallback>
      </Avatar>

      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-extrabold text-text" numberOfLines={1}>
          {friend.display_name || t("Friend")}
        </Text>
        {friend.nickname ? (
          <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
            @{friend.nickname}
          </Text>
        ) : null}
        <Text className="text-xs font-semibold text-text-muted" numberOfLines={1}>
          {t("{wishlistsCount} wishlists · {mutualCount} mutual", {
            wishlistsCount: friend.wishlists_count,
            mutualCount: friend.mutual_friends_count,
          })}
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={t("Remove friend")}
          onPress={(event) => {
            event.stopPropagation();
            onRemove(friend.friend_id);
          }}
          className="rounded-full"
        >
          <Icon as={UserMinus} className="size-4 text-destructive" />
        </Button>
      </View>
    </Pressable>
  );
}
