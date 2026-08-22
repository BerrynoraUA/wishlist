import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { BlockedUser } from "@wishlist/backend/types/friends";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function BlockedUserCard({
  user,
  isPending,
  onUnblock,
}: {
  user: BlockedUser;
  isPending?: boolean;
  onUnblock: (userId: string) => void;
}) {
  const t = useGT();
  const name = user.display_name || user.nickname || t("Unknown user");

  return (
    <View className="gap-4 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="flex-row items-center gap-3">
        <Avatar className="size-12 opacity-60" alt={name}>
          {user.avatar_url ? <AvatarImage source={{ uri: user.avatar_url }} /> : null}
          <AvatarFallback className="bg-bg-muted" initialsClassName="text-base text-text-muted" />
        </Avatar>

        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-extrabold text-text" numberOfLines={1}>
            {name}
          </Text>
          {user.nickname ? (
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              @{user.nickname}
            </Text>
          ) : null}
          <Text className="text-xs font-semibold text-text-muted" numberOfLines={2}>
            {t("Cannot send you requests or see your wishlists")}
          </Text>
        </View>
      </View>

      <Button variant="outline" disabled={isPending} onPress={() => onUnblock(user.id)}>
        <Text>{t("Unblock")}</Text>
      </Button>
    </View>
  );
}
