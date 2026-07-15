import { NotificationPreferenceToggles } from "@/components/settings/notification-preference-toggles";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Bell } from "lucide-react-native";
import { useGT } from "gt-react-native";

export function NotificationSettings({
  settings,
}: {
  settings: ReturnType<typeof useSettings>["data"];
}) {
  const t = useGT();
  const updateSettings = useUpdateSettings();

  return (
    <SettingsSection id="notifications" title={t("Push Notifications")} icon={Bell}>
      <NotificationPreferenceToggles
        preferences={{
          notify_friend_requests: settings?.notify_friend_requests ?? true,
          notify_secret_santa: settings?.notify_secret_santa ?? true,
          notify_reservations: settings?.notify_reservations ?? true,
          notify_new_wishlists: settings?.notify_new_wishlists ?? true,
          notify_upcoming_events: settings?.notify_upcoming_events ?? true,
          notify_group_added: settings?.notify_group_added ?? true,
          notify_wishlist_access: settings?.notify_wishlist_access ?? true,
          notify_reserved_item_updates: settings?.notify_reserved_item_updates ?? true,
        }}
        onChange={(key, value) => updateSettings.mutate({ [key]: value })}
      />
    </SettingsSection>
  );
}
