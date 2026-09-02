import { hapticSelection } from "@/lib/haptics";
import { FeatureIdeaCard } from "@/components/feature-ideas/feature-idea-card";
import { FeatureIdeasTabs } from "@/components/feature-ideas/feature-ideas-tabs";
import { SubmitFeatureIdeaSheet } from "@/components/feature-ideas/submit-feature-idea-sheet";
import { MascotEmptyState } from "@/components/shared/mascot-empty-state";
import { Button } from "@/components/ui/button";
import { AnimatedGradientBackgroundButton } from "@/components/ui/buttons/AnimatedGradientBackgroundButton";
import { Icon } from "@/components/ui/icon";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
import { useTabBarContentPadding } from "@/lib/layout";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { useFeatureIdeas, useToggleFeatureIdeaVote } from "@/hooks/use-feature-ideas";
import {
  DEFAULT_IDEA_STATUS_FILTER,
  filterIdeasByStatus,
  type IdeaStatusFilter,
  sortIdeasByVotes,
} from "@/lib/feature-ideas";
import { PREFERENCE_KEYS, preferencesStorage } from "@/lib/storage";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { ArrowLeft, Clock3, Info, Lightbulb, RefreshCw, X } from "lucide-react-native";
import * as React from "react";
import { RefreshControl, View, useWindowDimensions } from "react-native";
import { ListRowsSkeleton } from "@/components/ui/list-skeletons";
import { useMMKVBoolean } from "react-native-mmkv";

export default function IdeasScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { paddingTop, onHeaderLayout } = usePinnedListHeaderPadding(2);
  const paddingBottom = useTabBarContentPadding();
  const ideasQuery = useFeatureIdeas();
  const toggleVote = useToggleFeatureIdeaVote();
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [introDismissed, setIntroDismissed] = useMMKVBoolean(
    PREFERENCE_KEYS.featureIdeasIntroDismissed,
    preferencesStorage,
  );
  const [statusFilter, setStatusFilter] = React.useState<IdeaStatusFilter>(
    DEFAULT_IDEA_STATUS_FILTER,
  );
  const ideas = ideasQuery.data ?? [];
  const visibleIdeas = React.useMemo(
    () => sortIdeasByVotes(filterIdeasByStatus(ideas, statusFilter)),
    [ideas, statusFilter],
  );
  const handleVote = React.useCallback((ideaId: string) => toggleVote.mutate(ideaId), [toggleVote]);

  const listHeader = (
    <View className="gap-4 pb-4">
      {!introDismissed ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-info/20 bg-info-bg p-4">
          <Icon as={Info} className="mt-0.5 size-5 shrink-0 text-info" />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-text">
            {t(
              "Share feature ideas for this app and vote for the ones you like. The most popular ideas help us decide what to build next.",
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
              "Thanks! Your idea has been submitted and is awaiting review. It will appear here once approved.",
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
      <Stack.Screen options={{ title: t("Feature Ideas") }} />
      <View className="flex-1 bg-bg">
        <PinnedListHeader contentWidth={width - 32} onLayout={onHeaderLayout}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t("Back")}
                onPress={() => router.back()}
                className="rounded-full"
              >
                <Icon as={ArrowLeft} className="size-5 text-text" />
              </Button>
              <Text className="min-w-0 flex-1 text-xl font-extrabold text-text" numberOfLines={1}>
                {t("Feature Ideas")}
              </Text>
            </View>
            <AnimatedGradientBackgroundButton
              accessibilityLabel={t("Submit Idea")}
              Icon={<Icon as={Lightbulb} className="size-4 text-primary-foreground" />}
              onPress={() => setSubmitOpen(true)}
              title={t("Submit Idea")}
            />
          </View>
          <FeatureIdeasTabs value={statusFilter} onChange={setStatusFilter} />
        </PinnedListHeader>
        <StyledFlashList
          data={visibleIdeas}
          renderItem={({ item }) => (
            <FeatureIdeaCard
              idea={item}
              votePending={toggleVote.isPending && toggleVote.variables === item.id}
              onVote={handleVote}
            />
          )}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerClassName="px-4"
          contentContainerStyle={{ paddingTop, paddingBottom }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            ideasQuery.isLoading ? (
              <ListRowsSkeleton className="py-4" />
            ) : ideasQuery.isError ? (
              <View className="items-center gap-4 py-14">
                <Text className="text-center text-sm font-semibold text-text-muted">
                  {t("Failed to load ideas.")}
                </Text>
                <Button variant="outline" onPress={() => void ideasQuery.refetch()}>
                  <Icon as={RefreshCw} className="size-4 text-text" />
                  <Text>{t("Try again")}</Text>
                </Button>
              </View>
            ) : ideas.length === 0 ? (
              <MascotEmptyState
                variant="lightbulb-idea"
                message={t("No ideas yet. Be the first to share one!")}
              />
            ) : (
              <Text className="py-12 text-center text-sm font-semibold text-text-muted">
                {t("No ideas match this filter.")}
              </Text>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={ideasQuery.isRefetching && !ideasQuery.isLoading}
              onRefresh={() => {
                hapticSelection();
                void ideasQuery.refetch();
              }}
              tintColor="currentColor"
              progressViewOffset={paddingTop}
            />
          }
        />
      </View>
      <SubmitFeatureIdeaSheet
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => setSubmitted(true)}
      />
    </>
  );
}
