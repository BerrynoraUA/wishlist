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
      <View className="flex-row items-start gap-3">
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
              ? "h-9 shrink-0 flex-row items-center justify-center gap-1 rounded-full border border-brand/30 bg-brand-lighter px-3"
              : "h-9 shrink-0 flex-row items-center justify-center gap-1 rounded-full border border-border bg-bg-subtle px-3"
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

        <View className="min-w-0 flex-1 pt-1.5">
          <Text className="text-base font-extrabold leading-5 text-text" numberOfLines={2}>
            {idea.title}
          </Text>
        </View>
        <StatusBadge status={idea.status} />
      </View>

      <Text className="text-sm leading-5 text-text-muted" numberOfLines={expanded ? undefined : 3}>
        {idea.description}
      </Text>

      <View className="flex-row items-center gap-2 border-t border-border-subtle pt-3">
        <Avatar alt={authorName} className="size-6">
          {idea.user_avatar_url ? <AvatarImage source={{ uri: idea.user_avatar_url }} /> : null}
          <AvatarFallback initialsClassName="text-[10px]" />
        </Avatar>
        <Text className="min-w-0 flex-1 text-xs font-semibold text-text-muted" numberOfLines={1}>
          {authorName}
        </Text>
        <Text className="text-xs text-text-light">{date}</Text>
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
          containerClassName:
            "border-brand/30 bg-brand-lighter dark:border-brand/60 dark:bg-brand/30",
          contentClassName: "text-brand dark:text-white",
        }
      : status === "in_development"
        ? {
            label: t("In Development"),
            icon: Code2,
            containerClassName: "border-info/30 bg-info-bg dark:border-info/60 dark:bg-info/30",
            contentClassName: "text-info dark:text-white",
          }
        : {
            label: t("Done"),
            icon: CheckCircle2,
            containerClassName:
              "border-success/30 bg-success-bg dark:border-success/60 dark:bg-success/30",
            contentClassName: "text-success dark:text-white",
          };

  return (
    <View
      className={`self-start flex-row items-center gap-1 rounded-full border px-2 py-1 ${config.containerClassName}`}
    >
      <Icon as={config.icon} className={`size-3 ${config.contentClassName}`} />
      <Text className={`text-[11px] font-bold ${config.contentClassName}`}>{config.label}</Text>
    </View>
  );
}
