import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Bell, CalendarDays, Gift, ListPlus, PartyPopper, UserPlus } from "lucide-react-native";
import { useGT } from "gt-react-native";

export function NotificationSettings({
  settings,
}: {
  settings: ReturnType<typeof useSettings>["data"];
}) {
  const t = useGT();
  const updateSettings = useUpdateSettings();

  return (
    <SettingsSection title={t("Push Notifications")} icon={Bell}>
      <SettingsControlsToggleRow
        icon={UserPlus}
        title={t("Friend Requests")}
        checked={settings?.notify_friend_requests ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_friend_requests: value })}
      />
      <SettingsControlsToggleRow
        icon={PartyPopper}
        title={t("Secret Santa Invites")}
        checked={settings?.notify_secret_santa ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_secret_santa: value })}
      />
      <SettingsControlsToggleRow
        icon={Gift}
        title={t("Item Reservations")}
        checked={settings?.notify_reservations ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_reservations: value })}
      />
      <SettingsControlsToggleRow
        icon={ListPlus}
        title={t("New Wishlists")}
        checked={settings?.notify_new_wishlists ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_new_wishlists: value })}
      />
      <SettingsControlsToggleRow
        icon={CalendarDays}
        title={t("Upcoming Events")}
        checked={settings?.notify_upcoming_events ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_upcoming_events: value })}
      />
    </SettingsSection>
  );
}
