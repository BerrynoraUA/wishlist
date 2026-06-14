import { Subscription } from "@/components/subscription/subscription";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";

export default function SubscriptionScreen() {
  const router = useRouter();
  const t = useGT();

  return (
    <>
      <Stack.Screen options={{ title: t("Subscription") }} />
      <Subscription onClose={() => router.back()} onCompleted={() => router.back()} />
    </>
  );
}
