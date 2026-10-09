import { BugReportCard } from "@/components/bug-reports/bug-report-card";
import { BugReportsTabs } from "@/components/bug-reports/bug-reports-tabs";
import { SubmitBugReportSheet } from "@/components/bug-reports/submit-bug-report-sheet";
import { MascotEmptyState } from "@/components/shared/mascot-empty-state";
import { Button } from "@/components/ui/button";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { AnimatedGradientBackgroundButton } from "@/components/ui/buttons/AnimatedGradientBackgroundButton";
import { Icon } from "@/components/ui/icon";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
import { useTabBarContentPadding } from "@/lib/layout";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { useBugReports } from "@/hooks/use-bug-reports";
import {
  DEFAULT_BUG_STATUS_FILTER,
  filterBugsByStatus,
  type BugStatusFilter,
} from "@/lib/bug-reports";
import { Stack } from "expo-router";
import { useGT } from "gt-react-native";
import { Clock3, Info, Plus, RefreshCw, X } from "lucide-react-native";
import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import { ListRowsSkeleton } from "@/components/ui/list-skeletons";

export default function BugsScreen() {
  const t = useGT();
  const [actionWidth, setActionWidth] = React.useState(0);
  const { width } = useWindowDimensions();
  const { paddingTop, onHeaderLayout } = usePinnedListHeaderPadding(2);
  const paddingBottom = useTabBarContentPadding();
  const reportsQuery = useBugReports();
  const [reportOpen, setReportOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [introDismissed, setIntroDismissed] = React.useState(false);
  const [statusFilter, setStatusFilter] =
    React.useState<BugStatusFilter>(DEFAULT_BUG_STATUS_FILTER);
  const reports = reportsQuery.data ?? [];
  const visibleReports = React.useMemo(
    () => filterBugsByStatus(reports, statusFilter),
    [reports, statusFilter],
  );

  const listHeader = (
    <View className="gap-4 pb-4">
      {!introDismissed ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-info/20 bg-info-bg p-4">
          <Icon as={Info} className="mt-0.5 size-5 shrink-0 text-info" />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-text">
            {t(
              "Found something broken? Report it here. Once we confirm a bug it shows up on this board, so you can follow along as we work through it.",
            )}
          </Text>
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel={t("Dismiss")}
            onPress={() => setIntroDismissed(true)}
            className="-me-2 -mt-2 rounded-full"
          >
            <Icon as={X} className="size-4 text-info" />
          </Button>
        </View>
      ) : null}

      {submitted ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-brand/20 bg-brand-lighter p-4">
          <Icon as={Clock3} className="mt-0.5 size-5 shrink-0 text-brand" />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-text">
            {t(
              "Thanks! Your report has been submitted and is awaiting review. It will appear here once confirmed.",
            )}
          </Text>
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel={t("Dismiss")}
            onPress={() => setSubmitted(false)}
            className="-me-2 -mt-2 rounded-full"
          >
            <Icon as={X} className="size-4 text-brand" />
          </Button>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t("Bug Reports") }} />
      <View className="flex-1 bg-bg">
        <PinnedListHeader contentWidth={width - 32} onLayout={onHeaderLayout}>
          {/* Title centred on the screen; padded by the action's width so a long translation
              never runs under it. Back lives in the shared floating button, as on every
              other detail screen. */}
          <View className="min-h-11 justify-center">
            <Text
              className="text-center text-xl font-extrabold text-text"
              numberOfLines={1}
              style={{ paddingHorizontal: actionWidth + 8 }}
            >
              {t("Bug Reports")}
            </Text>
            <View
              className="absolute end-0"
              onLayout={(event) => setActionWidth(event.nativeEvent.layout.width)}
            >
              <AnimatedGradientBackgroundButton
                iconOnly
                accessibilityLabel={t("Report a Bug")}
                Icon={<Icon as={Plus} className="size-6 text-primary-foreground" />}
                onPress={() => setReportOpen(true)}
                title={t("Report")}
              />
            </View>
          </View>
          <BugReportsTabs value={statusFilter} onChange={setStatusFilter} />
        </PinnedListHeader>
        <StyledFlashList
          data={visibleReports}
          renderItem={({ item }) => <BugReportCard report={item} />}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerClassName="px-4"
          contentContainerStyle={{ paddingTop, paddingBottom }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            reportsQuery.isLoading ? (
              <ListRowsSkeleton className="py-4" />
            ) : reportsQuery.isError ? (
              <View className="items-center gap-4 py-14">
                <Text className="text-center text-sm font-semibold text-text-muted">
                  {t("Failed to load bug reports.")}
                </Text>
                <Button variant="outline" onPress={() => void reportsQuery.refetch()}>
                  <Icon as={RefreshCw} className="size-4 text-text" />
                  <Text>{t("Try again")}</Text>
                </Button>
              </View>
            ) : reports.length === 0 ? (
              <MascotEmptyState
                variant="magnifying-glass"
                message={t("No known bugs right now. If you spot one, let us know!")}
              />
            ) : (
              <Text className="py-12 text-center text-sm font-semibold text-text-muted">
                {t("No bug reports match this filter.")}
              </Text>
            )
          }
          onRefresh={() => reportsQuery.refetch()}
          progressViewOffset={paddingTop}
        />
        <FloatingBackButton />
      </View>
      <SubmitBugReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => setSubmitted(true)}
      />
    </>
  );
}
