import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { TouchTarget } from "@/components/ui/touch-target";
import { useProGate } from "@/hooks/use-pro-gate";
import { SecretSantaPersonAvatar } from "@/components/secret-santa/secret-santa-person-avatar";
import { getSecretSantaPersonName } from "@/lib/secret-santa";
import type { SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import { Ban, Lock } from "lucide-react-native";
import { useGT } from "gt-react-native";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, View } from "react-native";

export type SecretSantaExclusionSelection = Record<string, Set<string>>;

export function SecretSantaExclusions({
  giverId,
  participants,
  exclusions,
  onChange,
}: {
  giverId: string;
  participants: SecretSantaPerson[];
  exclusions: SecretSantaExclusionSelection;
  onChange: Dispatch<SetStateAction<SecretSantaExclusionSelection>>;
}) {
  const t = useGT();
  const { isGated, openPaywall } = useProGate();
  const excluded = exclusions[giverId] ?? new Set<string>();
  const others = participants.filter((person) => person.id !== giverId);

  function toggleExclusion(excludedId: string) {
    onChange((previous) => {
      const next = new Set(previous[giverId] ?? []);
      if (next.has(excludedId)) next.delete(excludedId);
      else next.add(excludedId);
      return { ...previous, [giverId]: next };
    });
  }

  if (isGated) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={openPaywall}
        className="flex-row items-center gap-3 border-t border-border-subtle p-3 active:opacity-80"
      >
        <View className="size-9 items-center justify-center rounded-full bg-brand">
          <Icon as={Lock} className="size-4 text-white" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-extrabold text-text">
            {t("Secret Santa exclusions are a Pro feature")}
          </Text>
          <Text className="text-sm font-bold text-brand">{t("Upgrade to Pro")}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View className="gap-2 border-t border-border-subtle p-3">
      <Text className="text-sm text-text-muted">
        {t("Choose who this participant cannot draw.")}
      </Text>
      {others.length === 0 ? (
        <Text className="text-sm text-text-muted">{t("At least 2 participants required.")}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {others.map((other) => {
          const isExcluded = excluded.has(other.id);

          return (
            <TouchTarget
              key={other.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isExcluded }}
              onPress={() => toggleExclusion(other.id)}
              slop={4}
              pressedOpacity={1}
              pressedScale={1}
              stateLayer={false}
              contentClassName={
                isExcluded
                  ? "flex-row items-center gap-2 rounded-full bg-danger-bg px-2 py-1.5"
                  : "flex-row items-center gap-2 rounded-full bg-bg-subtle px-2 py-1.5"
              }
              pressedClassName={isExcluded ? undefined : "bg-brand-lighter"}
            >
              <SecretSantaPersonAvatar person={other} sizeClassName="size-6" />
              <Text
                className={
                  isExcluded ? "text-xs font-bold text-destructive" : "text-xs font-bold text-text"
                }
              >
                {getSecretSantaPersonName(other, t)}
              </Text>
              {isExcluded ? <Icon as={Ban} className="size-3 text-destructive" /> : null}
            </TouchTarget>
          );
        })}
      </View>
    </View>
  );
}
