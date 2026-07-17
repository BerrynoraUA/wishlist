import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import type { BugReport, BugReportStatus } from "@wishlist/backend/types/bug-reports";
import { useGT, useLocale } from "gt-react-native";
import { AlertCircle, CheckCircle2, Code2, Image as ImageIcon } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export const BugReportCard = React.memo(function BugReportCard({ report }: { report: BugReport }) {
  const t = useGT();
  const locale = useLocale();
  const [expanded, setExpanded] = React.useState(false);
  const authorName = report.user_display_name ?? t("Anonymous");
  const date = new Intl.DateTimeFormat(locale, DATE_FORMAT_OPTIONS).format(
    new Date(report.created_at),
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? t("Collapse bug report") : t("Expand bug report")}
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
    >
      <View className="flex-row items-start gap-3">
        <View className="size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <Icon as={AlertCircle} className="size-4 text-destructive" />
        </View>
        <View className="min-w-0 flex-1 pt-1.5">
          <Text className="text-base font-extrabold leading-5 text-text" numberOfLines={2}>
            {report.title}
          </Text>
        </View>
        <StatusBadge status={report.status} />
      </View>

      <Text className="text-sm leading-5 text-text-muted" numberOfLines={expanded ? undefined : 3}>
        {report.description}
      </Text>

      {report.screenshot_url ? (
        <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-muted">
          {expanded ? (
            <StyledImage
              source={{ uri: report.screenshot_url }}
              contentFit="cover"
              className="h-40 w-full"
            />
          ) : (
            <View className="h-12 flex-row items-center gap-2 px-3">
              <Icon as={ImageIcon} className="size-4 text-brand" />
              <Text className="text-sm font-semibold text-text-muted">
                {t("Screenshot attached")}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View className="flex-row items-center gap-2 border-t border-border-subtle pt-3">
        <Avatar alt={authorName} className="size-6">
          {report.user_avatar_url ? <AvatarImage source={{ uri: report.user_avatar_url }} /> : null}
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

function StatusBadge({ status }: { status: BugReportStatus }) {
  const t = useGT();
  if (status === "confirmed") {
    return (
      <View className="self-start flex-row items-center gap-1 rounded-full border border-destructive/30 bg-danger-bg px-2 py-1 dark:border-destructive/60 dark:bg-destructive/30">
        <Icon as={AlertCircle} className="size-3 text-destructive dark:text-white" />
        <Text className="text-[11px] font-bold text-destructive dark:text-white">
          {t("Confirmed")}
        </Text>
      </View>
    );
  }

  if (status === "in_progress") {
    return (
      <View className="self-start flex-row items-center gap-1 rounded-full border border-info/30 bg-info-bg px-2 py-1 dark:border-info/60 dark:bg-info/30">
        <Icon as={Code2} className="size-3 text-info dark:text-white" />
        <Text className="text-[11px] font-bold text-info dark:text-white">{t("In Progress")}</Text>
      </View>
    );
  }

  if (status === "fixed") {
    return (
      <View className="self-start flex-row items-center gap-1 rounded-full border border-success/30 bg-success-bg px-2 py-1 dark:border-success/60 dark:bg-success/30">
        <Icon as={CheckCircle2} className="size-3 text-success dark:text-white" />
        <Text className="text-[11px] font-bold text-success dark:text-white">{t("Fixed")}</Text>
      </View>
    );
  }

  return null;
}
