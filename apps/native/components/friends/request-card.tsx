import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { FriendRequestWithDetails } from "@wishlist/backend/types/friends";
import { useGT } from "gt-react-native";
import { ActivityIndicator, View } from "react-native";

function getInitials(request: FriendRequestWithDetails) {
  const source = request.display_name || request.nickname || "?";
  return source.slice(0, 1).toUpperCase();
}

export function RequestCard({
  request,
  accepting,
  rejecting,
  onAccept,
  onReject,
}: {
  request: FriendRequestWithDetails;
  accepting?: boolean;
  rejecting?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useGT();
  const disabled = Boolean(accepting || rejecting);

  return (
    <View className="gap-4 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="flex-row items-center gap-3">
        <Avatar className="size-12" alt={request.display_name || request.nickname || t("Friend")}>
          {request.avatar_url ? <AvatarImage source={{ uri: request.avatar_url }} /> : null}
          <AvatarFallback className="bg-brand-lighter">
            <Text className="text-base font-extrabold text-brand">{getInitials(request)}</Text>
          </AvatarFallback>
        </Avatar>

        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-extrabold text-text" numberOfLines={1}>
            {request.display_name || t("Friend")}
          </Text>
          {request.nickname ? (
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              @{request.nickname}
            </Text>
          ) : null}
          <Text className="text-xs font-semibold text-text-muted" numberOfLines={1}>
            {t("{mutualCount} mutual friends", {
              mutualCount: request.mutual_friends_count,
            })}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button className="flex-1" disabled={disabled} onPress={onAccept}>
          {accepting ? <ActivityIndicator colorClassName="accent-white" size="small" /> : null}
          <Text>{accepting ? t("Accepting...") : t("Accept")}</Text>
        </Button>
        <Button className="flex-1" variant="outline" disabled={disabled} onPress={onReject}>
          <Text>{rejecting ? t("Declining...") : t("Decline")}</Text>
        </Button>
      </View>
    </View>
  );
}
