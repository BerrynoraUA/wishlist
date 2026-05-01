import { ToggleRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Bell, Gift, Mail, UserPlus } from "lucide-react-native";

export function NotificationSettings({
  settings,
}: {
  settings: ReturnType<typeof useSettings>["data"];
}) {
  const updateSettings = useUpdateSettings();

  return (
    <SettingsSection title="Push Notifications" icon={Bell}>
      <ToggleRow
        icon={UserPlus}
        title="Friend Requests"
        checked={settings?.notify_friend_requests ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_friend_requests: value })}
      />
      <ToggleRow
        icon={Gift}
        title="Item Reservations"
        checked={settings?.notify_reservations ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_reservations: value })}
      />
      <ToggleRow
        icon={Bell}
        title="Sale Alerts"
        checked={settings?.notify_sale_alerts ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_sale_alerts: value })}
      />
      <ToggleRow
        icon={Mail}
        title="Email Digest"
        checked={settings?.email_digest ?? false}
        onCheckedChange={(value) => updateSettings.mutate({ email_digest: value })}
      />
    </SettingsSection>
  );
}
