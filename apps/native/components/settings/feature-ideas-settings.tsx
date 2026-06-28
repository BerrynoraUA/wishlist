import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { Lightbulb, MessageSquarePlus } from "lucide-react-native";
import { View } from "react-native";

export function FeatureIdeasSettings() {
  const t = useGT();
  const router = useRouter();

  return (
    <SettingsSection id="feature-ideas" title={t("Feedback")} icon={MessageSquarePlus}>
      <View className="gap-3">
        <Text className="text-sm leading-5 text-text-muted">
          {t("Share your ideas and vote for features you would like to see next.")}
        </Text>
        <Button onPress={() => router.push("/ideas")}>
          <Icon as={Lightbulb} className="size-4 text-primary-foreground" />
          <Text>{t("Request a Feature")}</Text>
        </Button>
      </View>
    </SettingsSection>
  );
}
