import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import type { FeatureIdea, FeatureIdeaStatus } from "@wishlist/backend/types/feature-ideas";
import { useLocale, useGT } from "gt-react-native";
import { CheckCircle2, ChevronUp, Code2, Sparkles } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export const FeatureIdeaCard = React.memo(function FeatureIdeaCard({
  idea,
  votePending,
  onVote,
}: {
  idea: FeatureIdea;
  votePending: boolean;
  onVote: (ideaId: string) => void;
}) {
  const t = useGT();
  const locale = useLocale();
  const [expanded, setExpanded] = React.useState(false);
  const authorName = idea.user_display_name ?? t("Anonymous");
  const initial = authorName.charAt(0).toUpperCase();
  const date = new Intl.DateTimeFormat(locale, DATE_FORMAT_OPTIONS).format(
    new Date(idea.created_at),
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? t("Collapse idea") : t("Expand idea")}
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
    >
      <View className="gap-3">
        <View className="gap-2">
          <Text className="text-base font-extrabold leading-5 text-text" numberOfLines={2}>
            {idea.title}
          </Text>
          <StatusBadge status={idea.status} />
        </View>

        <Text
          className="text-sm leading-5 text-text-muted"
          numberOfLines={expanded ? undefined : 3}
        >
          {idea.description}
        </Text>

        <View className="flex-row items-center gap-2">
          <Avatar alt={authorName} className="size-6">
            {idea.user_avatar_url ? <AvatarImage source={{ uri: idea.user_avatar_url }} /> : null}
            <AvatarFallback>
              <Text className="text-[10px] font-extrabold text-text-muted">{initial}</Text>
            </AvatarFallback>
          </Avatar>
          <Text className="min-w-0 flex-1 text-xs font-semibold text-text-muted" numberOfLines={1}>
            {authorName}
          </Text>
          <Text className="text-xs text-text-light">{date}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-border-subtle pt-3">
        <Text className="text-xs font-semibold text-text-light">
          {expanded ? t("Tap to collapse") : t("Tap to read more")}
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={t("Vote for {title}", { title: idea.title })}
          accessibilityState={{ selected: idea.has_voted, disabled: votePending }}
          disabled={votePending}
          onPress={(event) => {
            event.stopPropagation();
            onVote(idea.id);
          }}
          className={
            idea.has_voted
              ? "h-9 flex-row items-center justify-center gap-1 rounded-full border border-brand/30 bg-brand-lighter px-3"
              : "h-9 flex-row items-center justify-center gap-1 rounded-full border border-border bg-bg-subtle px-3"
          }
        >
          <Icon
            as={ChevronUp}
            className={idea.has_voted ? "size-4 text-brand" : "size-4 text-text-muted"}
          />
          <Text
            className={
              idea.has_voted
                ? "text-xs font-extrabold text-brand"
                : "text-xs font-extrabold text-text"
            }
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {idea.votes_count}
          </Text>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
});

function StatusBadge({ status }: { status: FeatureIdeaStatus }) {
  const t = useGT();
  const config =
    status === "approved"
      ? {
          label: t("Approved"),
          icon: Sparkles,
          className: "border-brand/20 bg-brand-lighter text-brand",
        }
      : status === "in_development"
        ? {
            label: t("In Development"),
            icon: Code2,
            className: "border-info/20 bg-info-bg text-info",
          }
        : {
            label: t("Done"),
            icon: CheckCircle2,
            className: "border-success/20 bg-success-bg text-success",
          };

  return (
    <View
      className={`self-start flex-row items-center gap-1 rounded-full border px-2 py-1 ${config.className}`}
    >
      <Icon as={config.icon} className="size-3 text-current" />
      <Text className="text-[11px] font-bold text-current">{config.label}</Text>
    </View>
  );
}
