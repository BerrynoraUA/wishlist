import { SecretSantaEventCard } from "@/components/secret-santa/secret-santa-event-card";
import { SecretSantaInvitesPanel } from "@/components/secret-santa/secret-santa-invites-panel";
import { InlineState } from "@/components/shared/inline-state";
import { ExpandingSearchHeader } from "@/components/ui/expanding-search-header";
import {
  ScrollableTabs,
  SCROLLABLE_TABS_TOP_GAP,
  type ScrollableTab,
} from "@/components/ui/scrollable-tabs";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { useNotifications } from "@/hooks/use-notifications";
import { useInfiniteSecretSantaEvents } from "@/hooks/use-secret-santa";
import { SECRET_SANTA_PAGE_SIZE } from "@/lib/secret-santa";
import { chunkRows } from "@/lib/layout";
import type { SecretSantaListItem } from "@wishlist/backend/types/secret-santa";
import { Stack, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SecretSantaRow = SecretSantaListItem[];
type SecretSantaTab = "events" | "invites";

export default function SecretSantaScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<SecretSantaTab>("events");

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.length === 0) setDebouncedSearch("");
  }

  const query = useInfiniteSecretSantaEvents(
    {
      search: debouncedSearch,
    },
    SECRET_SANTA_PAGE_SIZE,
  );
  const notificationsQuery = useNotifications({ limit: 50 });
  const events = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const inviteNotifications = React.useMemo(
    () =>
      (notificationsQuery.data ?? []).filter(
        (notification) => notification.type === 0 && notification.entity_id != null,
      ),
    [notificationsQuery.data],
  );
  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const rows = React.useMemo<SecretSantaRow[]>(() => chunkRows(events, columns), [columns, events]);
  const tabs = React.useMemo<ScrollableTab<SecretSantaTab>[]>(
    () => [
      { value: "events", label: t("Events") },
      {
        value: "invites",
        label: t("Invites"),
        count: inviteNotifications.length || undefined,
      },
    ],
    [inviteNotifications.length, t],
  );
  function renderRow({ item }: { item: SecretSantaRow }) {
    return (
      <View className="flex-row" style={{ alignSelf: "center", gap: gridGap, width: contentWidth }}>
        {item.map((event) => (
          <SecretSantaEventCard
            key={event.id}
            event={event}
            width={cardWidth}
            onPress={() =>
              router.push({ pathname: "/secret-santa/[id]", params: { id: event.id } } as never)
            }
          />
        ))}
      </View>
    );
  }

  function loadMoreEvents() {
    if (activeTab === "events" && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("Secret Santa") }} />
      <View className="flex-1 bg-bg">
        <StyledFlashList
          data={activeTab === "events" && !query.isLoading && !query.isError ? rows : []}
          renderItem={renderRow}
          keyExtractor={(row) => row.map((event) => event.id).join(":")}
          className="flex-1"
          contentContainerClassName="pb-8"
          contentContainerStyle={{ paddingTop: insets.top + SCROLLABLE_TABS_TOP_GAP }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          onEndReached={loadMoreEvents}
          isLoadingMore={activeTab === "events" && query.isFetchingNextPage}
          ListHeaderComponent={
            <View className="gap-5 self-center pb-8" style={{ width: contentWidth }}>
              <ExpandingSearchHeader
                search={search}
                onChangeSearch={handleSearchChange}
                placeholder={t("Search events")}
                contentWidth={contentWidth}
                onOpen={() => setActiveTab("events")}
              >
                <ScrollableTabs
                  tabs={tabs}
                  value={activeTab}
                  onChange={setActiveTab}
                  align="right"
                />
              </ExpandingSearchHeader>
            </View>
          }
          ListFooterComponent={
            <View className="gap-4 self-center" style={{ width: contentWidth }}>
              {activeTab === "invites" && notificationsQuery.isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null}
              {activeTab === "invites" && notificationsQuery.isError ? (
                <InlineState message={t("Failed to load invites.")} />
              ) : null}
              {activeTab === "invites" &&
              !notificationsQuery.isLoading &&
              !notificationsQuery.isError &&
              inviteNotifications.length > 0 ? (
                <SecretSantaInvitesPanel notifications={inviteNotifications} />
              ) : null}
              {activeTab === "invites" &&
              !notificationsQuery.isLoading &&
              !notificationsQuery.isError &&
              inviteNotifications.length === 0 ? (
                <InlineState
                  mascot="sleeping-bell"
                  message={t("No Secret Santa invites right now.")}
                />
              ) : null}
              {activeTab === "events" && query.isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null}
              {activeTab === "events" && query.isError ? (
                <InlineState message={t("Failed to load Secret Santa events.")} />
              ) : null}
              {activeTab === "events" &&
              !query.isLoading &&
              !query.isError &&
              events.length === 0 ? (
                <InlineState
                  mascot={debouncedSearch ? "magnifying-glass" : "santa-sack"}
                  message={
                    debouncedSearch
                      ? t("No Secret Santa events match your search.")
                      : t("No Secret Santa events yet. Create one to get started!")
                  }
                />
              ) : null}
            </View>
          }
          extraData={{
            activeTab,
            cardWidth,
            contentWidth,
            gridGap,
            inviteCount: inviteNotifications.length,
            search: debouncedSearch,
          }}
        />
      </View>
    </>
  );
}
