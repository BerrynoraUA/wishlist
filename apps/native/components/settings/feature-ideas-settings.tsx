import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { Bug, Lightbulb, MessageSquarePlus } from "lucide-react-native";
import { View } from "react-native";

export function FeatureIdeasSettings() {
  const t = useGT();
  const router = useRouter();

  return (
    <SettingsSection id="feature-ideas" title={t("Feedback")} icon={MessageSquarePlus}>
      <View className="gap-3">
        <Text className="text-sm leading-5 text-text-muted">
          {t("Share ideas, vote for features, or tell us when something breaks.")}
        </Text>
        <Button onPress={() => router.push("/ideas")}>
          <Icon as={Lightbulb} className="size-4 text-primary-foreground" />
          <Text>{t("Request a Feature")}</Text>
        </Button>
        <Button variant="outline" onPress={() => router.push("/bugs")}>
          <Icon as={Bug} className="size-4 text-text" />
          <Text>{t("Report a Bug")}</Text>
        </Button>
      </View>
    </SettingsSection>
  );
}
