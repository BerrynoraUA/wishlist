import { generateSecretSantaAssignment } from "@wishlist/backend/lib/secret-santa-assignment";
import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLaunchSecretSanta } from "@/hooks/use-secret-santa";
import { useProGate } from "@/hooks/use-pro-gate";
import { MIN_PARTICIPANTS_TO_LAUNCH } from "@/lib/secret-santa";
import type { SecretSantaExclusion, SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import { AlertTriangle, Ban, Sparkles } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function SecretSantaLaunchSheet({
  open,
  eventId,
  participants,
  exclusionList,
  onOpenChange,
  onLaunched,
}: {
  open: boolean;
  eventId: string;
  participants: SecretSantaPerson[];
  exclusionList: SecretSantaExclusion[];
  onOpenChange: (open: boolean) => void;
  onLaunched?: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const launch = useLaunchSecretSanta();
  const { isGated } = useProGate();
  const validationError = React.useMemo(() => {
    if (participants.length < MIN_PARTICIPANTS_TO_LAUNCH) {
      return t("At least 2 participants required.");
    }

    const ids = participants.map((person) => person.id);
    const exclusionMap = new Map<string, Set<string>>();
    for (const exclusion of isGated ? [] : exclusionList) {
      exclusionMap.set(exclusion.user_id, new Set(exclusion.excluded_ids));
    }

    return generateSecretSantaAssignment(ids, exclusionMap)
      ? null
      : t("These exclusions make a valid assignment impossible.");
  }, [exclusionList, isGated, participants, t]);
  const exclusionsCount = isGated
    ? 0
    : exclusionList.reduce((total, exclusion) => total + exclusion.excluded_ids.length, 0);

  if (!open) return null;

  function closeSheet() {
    void sheetRef.current?.dismiss();
  }

  function handleLaunch() {
    launch.mutate(
      {
        event_id: eventId,
        exclusions: isGated ? [] : exclusionList,
      },
      {
        onSuccess: () => {
          onLaunched?.();
          closeSheet();
        },
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={() => onOpenChange(false)}
      header={<BottomSheetHeader title={t("Launch Secret Santa")} />}
    >
      <View className="gap-4 px-5">
        <Text className="text-sm leading-5 text-text-muted">
          {t("Everyone will get a random match. Names can't be redrawn after the start.")}
        </Text>

        {exclusionsCount > 0 ? (
          <View className="flex-row items-center self-start gap-1 rounded-full bg-bg-subtle px-2 py-1">
            <Icon as={Ban} className="size-3.5 text-text-muted" />
            <Text className="text-xs font-extrabold text-text-muted">
              {exclusionsCount === 1
                ? t("1 exclusion")
                : t("{count} exclusions", { count: exclusionsCount })}
            </Text>
          </View>
        ) : null}

        {validationError ? (
          <View className="flex-row items-start gap-2 rounded-xl bg-danger-bg p-3">
            <Icon as={AlertTriangle} className="mt-0.5 size-4 text-destructive" />
            <Text className="flex-1 text-sm font-semibold text-destructive">{validationError}</Text>
          </View>
        ) : null}

        {launch.error ? (
          <View className="flex-row items-start gap-2 rounded-xl bg-danger-bg p-3">
            <Icon as={AlertTriangle} className="mt-0.5 size-4 text-destructive" />
            <Text className="flex-1 text-sm font-semibold text-destructive">
              {launch.error.message}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={launch.isPending}
            onPress={closeSheet}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={Boolean(validationError) || launch.isPending}
            onPress={handleLaunch}
          >
            {launch.isPending ? (
              <ActivityIndicator colorClassName="accent-white" />
            ) : (
              <Icon as={Sparkles} className="size-4 text-primary-foreground" />
            )}
            <Text>{launch.isPending ? t("Launching...") : t("Start")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
