import { Subscription } from "@/components/subscription/subscription";
import { HeroStatusBar } from "@/components/ui/hero-status-bar";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";

export default function SubscriptionScreen() {
  const router = useRouter();
  const t = useGT();

  return (
    <>
      <HeroStatusBar />
      <Stack.Screen options={{ title: t("Subscription") }} />
      <Subscription onClose={() => router.back()} onCompleted={() => router.back()} />
    </>
  );
}
