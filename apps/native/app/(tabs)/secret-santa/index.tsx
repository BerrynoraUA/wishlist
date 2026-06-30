import { SecretSantaEventCard } from "@/components/secret-santa/secret-santa-event-card";
import { SecretSantaInvitesPanel } from "@/components/secret-santa/secret-santa-invites-panel";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { InlineState } from "@/components/shared/inline-state";
import { Button } from "@/components/ui/button";
import { AnimatedGradientBackgroundButton } from "@/components/ui/buttons/AnimatedGradientBackgroundButton";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  ScrollableTabs,
  SCROLLABLE_TABS_TOP_GAP,
  type ScrollableTab,
} from "@/components/ui/scrollable-tabs";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { useNotifications } from "@/hooks/use-notifications";
import { useSecretSantaEvents } from "@/hooks/use-secret-santa";
import { SECRET_SANTA_PAGE_SIZE } from "@/lib/secret-santa";
import { chunkRows } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { SecretSantaListItem } from "@wishlist/backend/types/secret-santa";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { Plus, Search, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SecretSantaRow = SecretSantaListItem[];
type SecretSantaTab = "events" | "invites";
const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];

export default function SecretSantaScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SecretSantaTab>("events");

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useSecretSantaEvents({
    search: debouncedSearch,
    limit: SECRET_SANTA_PAGE_SIZE,
    offset: 0,
  });
  const notificationsQuery = useNotifications({ limit: 50 });
  const events = query.data?.items ?? [];
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
          ListHeaderComponent={
            <View className="gap-5 self-center pb-8" style={{ width: contentWidth }}>
              <ScrollableTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

              <View className="flex-row items-center justify-between gap-3">
                <Text className="min-w-0 flex-1 text-xl font-extrabold text-text">
                  {t("Secret Santa")}
                </Text>
                <AnimatedGradientBackgroundButton
                  accessibilityLabel={t("New Event")}
                  Icon={<Icon as={Plus} className="size-4 text-primary-foreground" />}
                  onPress={() => setCreateOpen(true)}
                  title={t("New Event")}
                />
              </View>

              {activeTab === "events" ? (
                <View
                  className={cn(
                    "flex-row items-center gap-2 rounded-full border px-3",
                    HAS_LIQUID_GLASS
                      ? "border-transparent bg-transparent"
                      : "border-border-subtle bg-card-bg shadow-sm",
                  )}
                >
                  {HAS_LIQUID_GLASS ? (
                    <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                  ) : null}
                  <Icon as={Search} className="size-4 text-text-muted" />
                  <Input
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t("Search events")}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
                    returnKeyType="search"
                  />
                  {search.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t("Clear search")}
                      onPress={() => {
                        setSearch("");
                        setDebouncedSearch("");
                      }}
                      className="size-9 shrink-0 rounded-full"
                    >
                      <Icon as={X} className="size-4 text-text-muted" />
                    </Button>
                  ) : null}
                </View>
              ) : null}
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

        <SecretSantaCreateEditSheet mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      </View>
    </>
  );
}
