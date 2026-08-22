import { SettingsControlsInfoRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { useRouter } from "expo-router";
import { CalendarDays, Crown, Sparkles } from "lucide-react-native";
import { useGT } from "gt-react-native";

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function SubscriptionSettings() {
  const t = useGT();
  const router = useRouter();
  const { isPro, expiresAt } = useSubscriptionStatus();
  const renewalDate = formatDate(expiresAt);

  return (
    <SettingsSection
      id="subscription"
      title={t("Subscription")}
      icon={Crown}
      headerAction={
        <Badge className={isPro ? "border-transparent bg-brand" : "bg-bg-muted"} variant="outline">
          <Text className={isPro ? "text-white" : "text-text-muted"}>
            {isPro ? t("Premium") : t("Free")}
          </Text>
        </Badge>
      }
    >
      <SettingsControlsInfoRow
        icon={Sparkles}
        title={isPro ? t("Wishlane Premium is active") : t("Upgrade to Wishlane Premium")}
        subtitle={
          isPro
            ? t("Unlimited lists and items, collaborator access, and custom sorting.")
            : t("Unlock more room for wishes, shared planning, and customization.")
        }
      />
      {isPro && renewalDate ? (
        <SettingsControlsInfoRow icon={CalendarDays} title={t("Renewal")} subtitle={renewalDate} />
      ) : null}
      <Button className="h-11" onPress={() => router.push("/subscription" as never)}>
        <Icon as={Crown} className="size-4 text-primary-foreground" />
        <Text>{isPro ? t("Manage subscription") : t("View plans")}</Text>
      </Button>
    </SettingsSection>
  );
}
