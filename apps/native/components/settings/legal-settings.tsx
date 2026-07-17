import { SettingsControlsInfoRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { openLegalPage, type LegalPage } from "@/lib/legal-links";
import * as Application from "expo-application";
import { useGT } from "gt-react-native";
import type { LucideIcon } from "lucide-react-native";
import { ExternalLink, FileText, Info, ReceiptText, Scale, ShieldCheck } from "lucide-react-native";
import { View } from "react-native";

export function LegalSettings() {
  const t = useGT();
  const links: { page: LegalPage; label: string; icon: LucideIcon }[] = [
    { page: "terms-of-service", label: t("Terms of Service"), icon: Scale },
    { page: "privacy-policy", label: t("Privacy Policy"), icon: ShieldCheck },
    { page: "refund-policy", label: t("Refund Policy"), icon: ReceiptText },
  ];
  const appVersion = Application.nativeApplicationVersion ?? "1.0.0";
  const buildVersion = Application.nativeBuildVersion;

  return (
    <SettingsSection id="legal" title={t("About & Legal")} icon={FileText}>
      <View className="gap-2">
        {links.map((link) => (
          <Button
            key={link.page}
            variant="outline"
            className="justify-start"
            onPress={() => void openLegalPage(link.page)}
          >
            <Icon as={link.icon} className="size-4 text-text" />
            <Text className="flex-1">{link.label}</Text>
            <Icon as={ExternalLink} className="size-4 text-text-muted" />
          </Button>
        ))}
      </View>
      <SettingsControlsInfoRow
        icon={Info}
        title={t("App version")}
        subtitle={buildVersion ? `${appVersion} (${buildVersion})` : appVersion}
      />
    </SettingsSection>
  );
}
