import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import {
  CalendarDays,
  Gift,
  ListPlus,
  RefreshCw,
  Share2,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import { Image } from "react-native";

export type NotificationPreferences = {
  notify_friend_requests: boolean;
  notify_secret_santa: boolean;
  notify_reservations: boolean;
  notify_new_wishlists: boolean;
  notify_upcoming_events: boolean;
  notify_group_added: boolean;
  notify_wishlist_access: boolean;
  notify_reserved_item_updates: boolean;
};

export function NotificationPreferenceToggles({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (key: keyof NotificationPreferences, value: boolean) => void;
}) {
  const t = useGT();

  return (
    <>
      <SettingsControlsToggleRow
        icon={UserPlus}
        title={t("Friend Requests")}
        subtitle={t("When someone sends you a friend request")}
        checked={preferences.notify_friend_requests}
        onCheckedChange={(value) => onChange("notify_friend_requests", value)}
      />
      <SettingsControlsToggleRow
        iconContent={
          <Image
            source={require("@/assets/images/secret-santa-tab.png")}
            className="size-5"
            tintColorClassName="accent-brand"
          />
        }
        title={t("Secret Santa Invites")}
        subtitle={t("When someone invites you to a Secret Santa event")}
        checked={preferences.notify_secret_santa}
        onCheckedChange={(value) => onChange("notify_secret_santa", value)}
      />
      <SettingsControlsToggleRow
        icon={Gift}
        title={t("Item Reservations")}
        subtitle={t("When a friend reserves an item from your wishlist")}
        checked={preferences.notify_reservations}
        onCheckedChange={(value) => onChange("notify_reservations", value)}
      />
      <SettingsControlsToggleRow
        icon={ListPlus}
        title={t("New Wishlists")}
        subtitle={t("When a friend creates a public or friends-only wishlist")}
        checked={preferences.notify_new_wishlists}
        onCheckedChange={(value) => onChange("notify_new_wishlists", value)}
      />
      <SettingsControlsToggleRow
        icon={CalendarDays}
        title={t("Upcoming Events")}
        subtitle={t("When a friend's wishlist event is coming up")}
        checked={preferences.notify_upcoming_events}
        onCheckedChange={(value) => onChange("notify_upcoming_events", value)}
      />
      <SettingsControlsToggleRow
        icon={Users}
        title={t("Group Invitations")}
        subtitle={t("When someone adds you to a friend group")}
        checked={preferences.notify_group_added}
        onCheckedChange={(value) => onChange("notify_group_added", value)}
      />
      <SettingsControlsToggleRow
        icon={Share2}
        title={t("Wishlist Access")}
        subtitle={t("When someone shares a wishlist with you")}
        checked={preferences.notify_wishlist_access}
        onCheckedChange={(value) => onChange("notify_wishlist_access", value)}
      />
      <SettingsControlsToggleRow
        icon={RefreshCw}
        title={t("Reserved Item Updates")}
        subtitle={t("When an item you reserved is updated")}
        checked={preferences.notify_reserved_item_updates}
        onCheckedChange={(value) => onChange("notify_reserved_item_updates", value)}
      />
    </>
  );
}
