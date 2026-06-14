import { InlineState } from "@/components/shared/inline-state";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useJoinSecretSantaEvent } from "@/hooks/use-secret-santa";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export default function SecretSantaJoinScreen() {
  const t = useGT();
  const router = useRouter();
  const params = useLocalSearchParams<{ event?: string }>();
  const eventId = String(params.event ?? "");
  const join = useJoinSecretSantaEvent();
  const attempted = React.useRef(false);

  React.useEffect(() => {
    if (!eventId || attempted.current) return;
    attempted.current = true;

    join.mutate(eventId, {
      onSuccess: () =>
        router.replace({ pathname: "/secret-santa/[id]", params: { id: eventId } } as never),
      onError: () =>
        router.replace({ pathname: "/secret-santa/[id]", params: { id: eventId } } as never),
    });
  }, [eventId, join, router]);

  return (
    <>
      <Stack.Screen options={{ title: t("Secret Santa") }} />
      <View className="flex-1 items-center justify-center gap-4 bg-bg p-6">
        {eventId ? (
          <>
            <ActivityIndicator colorClassName="accent-brand" />
            <Text className="text-center text-base font-semibold text-text">
              {t("Joining event...")}
            </Text>
          </>
        ) : (
          <>
            <InlineState message={t("Invalid invite link.")} />
            <Button onPress={() => router.replace("/secret-santa" as never)}>
              <Text>{t("Back to events")}</Text>
            </Button>
          </>
        )}
      </View>
    </>
  );
}
