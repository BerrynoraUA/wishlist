import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import { CalendarDays, Gift, ListPlus, PartyPopper, UserPlus } from "lucide-react-native";
import { useGT } from "gt-react-native";

export type NotificationPreferences = {
  notify_friend_requests: boolean;
  notify_secret_santa: boolean;
  notify_reservations: boolean;
  notify_new_wishlists: boolean;
  notify_upcoming_events: boolean;
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
        checked={preferences.notify_friend_requests}
        onCheckedChange={(value) => onChange("notify_friend_requests", value)}
      />
      <SettingsControlsToggleRow
        icon={PartyPopper}
        title={t("Secret Santa Invites")}
        checked={preferences.notify_secret_santa}
        onCheckedChange={(value) => onChange("notify_secret_santa", value)}
      />
      <SettingsControlsToggleRow
        icon={Gift}
        title={t("Item Reservations")}
        checked={preferences.notify_reservations}
        onCheckedChange={(value) => onChange("notify_reservations", value)}
      />
      <SettingsControlsToggleRow
        icon={ListPlus}
        title={t("New Wishlists")}
        checked={preferences.notify_new_wishlists}
        onCheckedChange={(value) => onChange("notify_new_wishlists", value)}
      />
      <SettingsControlsToggleRow
        icon={CalendarDays}
        title={t("Upcoming Events")}
        checked={preferences.notify_upcoming_events}
        onCheckedChange={(value) => onChange("notify_upcoming_events", value)}
      />
    </>
  );
}
