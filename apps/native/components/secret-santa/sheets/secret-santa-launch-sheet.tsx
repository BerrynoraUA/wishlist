import { generateSecretSantaAssignment } from "@/lib/secret-santa-assignment";
import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { SecretSantaPersonAvatar } from "@/components/secret-santa/secret-santa-person-avatar";
import { useLaunchSecretSanta } from "@/hooks/use-secret-santa";
import { useProGate } from "@/hooks/use-pro-gate";
import { MIN_PARTICIPANTS_TO_LAUNCH, getSecretSantaPersonName } from "@/lib/secret-santa";
import type { SecretSantaExclusion, SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Users,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

export function SecretSantaLaunchSheet({
  open,
  eventId,
  participants,
  onOpenChange,
  onLaunched,
}: {
  open: boolean;
  eventId: string;
  participants: SecretSantaPerson[];
  onOpenChange: (open: boolean) => void;
  onLaunched?: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const launch = useLaunchSecretSanta();
  const { isGated, openPaywall } = useProGate();
  const [exclusions, setExclusions] = React.useState<Record<string, Set<string>>>({});
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setExclusions({});
    setExpandedId(null);
  }, [open]);

  const exclusionList = React.useMemo<SecretSantaExclusion[]>(
    () =>
      Object.entries(exclusions)
        .filter(([, set]) => set.size > 0)
        .map(([user_id, set]) => ({ user_id, excluded_ids: [...set] })),
    [exclusions],
  );

  const validationError = React.useMemo(() => {
    if (participants.length < MIN_PARTICIPANTS_TO_LAUNCH) {
      return t("At least 2 participants required.");
    }

    const ids = participants.map((person) => person.id);
    const exclusionMap = new Map<string, Set<string>>();
    for (const exclusion of exclusionList) {
      exclusionMap.set(exclusion.user_id, new Set(exclusion.excluded_ids));
    }

    return generateSecretSantaAssignment(ids, exclusionMap)
      ? null
      : t("These exclusions make a valid assignment impossible.");
  }, [exclusionList, participants, t]);

  if (!open) return null;

  function toggleExclusion(giverId: string, excludedId: string) {
    setExclusions((previous) => {
      const next = { ...previous };
      const set = new Set(previous[giverId] ?? []);

      if (set.has(excludedId)) {
        set.delete(excludedId);
      } else {
        set.add(excludedId);
      }

      next[giverId] = set;
      return next;
    });
  }

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
      scrollable
      onDidDismiss={() => onOpenChange(false)}
      header={<BottomSheetHeader title={t("Launch Secret Santa")} />}
    >
      <View className="gap-5 px-5">
        <View className="flex-row flex-wrap gap-2">
          <View className="flex-row items-center gap-1 rounded-full bg-brand-lighter px-2 py-1">
            <Icon as={Users} className="size-3.5 text-brand" />
            <Text className="text-xs font-extrabold text-brand">
              {t("{count} people", { count: participants.length })}
            </Text>
          </View>
          {!isGated ? (
            <View className="flex-row items-center gap-1 rounded-full bg-bg-subtle px-2 py-1">
              <Icon as={Ban} className="size-3.5 text-text-muted" />
              <Text className="text-xs font-extrabold text-text-muted">
                {t("Optional exclusions")}
              </Text>
            </View>
          ) : null}
        </View>

        {isGated ? (
          <Pressable
            accessibilityRole="button"
            onPress={openPaywall}
            className="items-center gap-3 rounded-xl border border-brand/30 bg-brand-lighter p-5 active:opacity-80"
          >
            <View className="size-11 items-center justify-center rounded-full bg-brand">
              <Icon as={Lock} className="size-5 text-white" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-center text-base font-extrabold text-text">
                {t("Secret Santa exclusions are a Pro feature")}
              </Text>
              <Text className="text-center text-sm text-text-muted">
                {t("Upgrade to control who each participant cannot draw.")}
              </Text>
            </View>
            <Text className="font-extrabold text-brand">{t("Upgrade to Pro")}</Text>
          </Pressable>
        ) : (
          <View className="gap-3">
            {participants.map((giver) => {
              const isExpanded = expandedId === giver.id;
              const excluded = exclusions[giver.id] ?? new Set<string>();
              const others = participants.filter((person) => person.id !== giver.id);

              return (
                <View
                  key={giver.id}
                  className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpandedId(isExpanded ? null : giver.id)}
                    className="flex-row items-center gap-3 p-3 active:bg-bg-subtle"
                  >
                    <SecretSantaPersonAvatar person={giver} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-extrabold text-text" numberOfLines={1}>
                        {getSecretSantaPersonName(giver, t)}
                      </Text>
                      {excluded.size > 0 ? (
                        <Text className="text-xs text-text-muted">
                          {excluded.size === 1
                            ? t("1 exclusion")
                            : t("{count} exclusions", { count: excluded.size })}
                        </Text>
                      ) : null}
                    </View>
                    <Icon
                      as={isExpanded ? ChevronUp : ChevronDown}
                      className="size-4 text-text-muted"
                    />
                  </Pressable>

                  {isExpanded ? (
                    <View className="flex-row flex-wrap gap-2 border-t border-border-subtle p-3">
                      {others.map((other) => {
                        const isExcluded = excluded.has(other.id);

                        return (
                          <Pressable
                            key={other.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isExcluded }}
                            onPress={() => toggleExclusion(giver.id, other.id)}
                            className={
                              isExcluded
                                ? "flex-row items-center gap-2 rounded-full bg-danger-bg px-2 py-1.5"
                                : "flex-row items-center gap-2 rounded-full bg-bg-subtle px-2 py-1.5 active:bg-brand-lighter"
                            }
                          >
                            <SecretSantaPersonAvatar person={other} sizeClassName="size-6" />
                            <Text
                              className={
                                isExcluded
                                  ? "text-xs font-bold text-destructive"
                                  : "text-xs font-bold text-text"
                              }
                            >
                              {getSecretSantaPersonName(other, t)}
                            </Text>
                            {isExcluded ? (
                              <Icon as={Ban} className="size-3 text-destructive" />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

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
