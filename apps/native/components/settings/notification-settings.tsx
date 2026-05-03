import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Bell, Gift, Mail, UserPlus } from "lucide-react-native";
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
        icon={Gift}
        title={t("Item Reservations")}
        checked={settings?.notify_reservations ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_reservations: value })}
      />
      <SettingsControlsToggleRow
        icon={Bell}
        title={t("Sale Alerts")}
        checked={settings?.notify_sale_alerts ?? true}
        onCheckedChange={(value) => updateSettings.mutate({ notify_sale_alerts: value })}
      />
      <SettingsControlsToggleRow
        icon={Mail}
        title={t("Email Digest")}
        checked={settings?.email_digest ?? false}
        onCheckedChange={(value) => updateSettings.mutate({ email_digest: value })}
      />
    </SettingsSection>
  );
}
