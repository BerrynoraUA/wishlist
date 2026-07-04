import { SecretSantaEventCard } from "@/components/secret-santa/secret-santa-event-card";
import { SecretSantaInvitesPanel } from "@/components/secret-santa/secret-santa-invites-panel";
import { InlineState } from "@/components/shared/inline-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ScrollableTabs,
  SCROLLABLE_TABS_TOP_GAP,
  type ScrollableTab,
} from "@/components/ui/scrollable-tabs";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { useNotifications } from "@/hooks/use-notifications";
import { useSecretSantaEvents } from "@/hooks/use-secret-santa";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { SECRET_SANTA_PAGE_SIZE } from "@/lib/secret-santa";
import { chunkRows } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { SecretSantaListItem } from "@wishlist/backend/types/secret-santa";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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
  const reduceMotion = useReducedMotion();
  const searchInputRef = React.useRef<TextInput>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [tabsVisible, setTabsVisible] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<SecretSantaTab>("events");
  const searchProgress = useSharedValue(0);

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
  const tabsWidth = contentWidth - 56;
  const searchCollapsedWidth = 44;
  const searchExpandedWidth = contentWidth;
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
  const searchExpanded = searchOpen || search.length > 0;

  React.useEffect(() => {
    const duration = reduceMotion ? 0 : motionDuration.normal;

    searchProgress.value = withTiming(searchExpanded ? 1 : 0, {
      duration,
    });

    if (searchExpanded) {
      setTabsVisible(false);
      const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    const timeout = setTimeout(() => setTabsVisible(true), duration);
    return () => clearTimeout(timeout);
  }, [reduceMotion, searchExpanded, searchProgress]);

  const searchContainerStyle = useAnimatedStyle(() => ({
    width:
      searchCollapsedWidth + (searchExpandedWidth - searchCollapsedWidth) * searchProgress.value,
  }));

  const searchInputStyle = useAnimatedStyle(() => ({
    opacity: searchProgress.value,
  }));

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
              <View className="relative h-11">
                {tabsVisible ? (
                  <View className="absolute left-0 top-0" style={{ width: tabsWidth }}>
                    <ScrollableTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
                  </View>
                ) : null}
                <Animated.View
                  className={cn(
                    "absolute right-0 top-0 z-10 h-11 overflow-hidden rounded-full border",
                    HAS_LIQUID_GLASS
                      ? "border-transparent bg-transparent"
                      : "border-border-subtle bg-card-bg shadow-sm",
                  )}
                  style={searchContainerStyle}
                >
                  {HAS_LIQUID_GLASS ? (
                    <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                  ) : null}
                  <View className="h-full flex-row items-center gap-2 px-0">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      accessibilityLabel={searchExpanded ? t("Focus search") : t("Open search")}
                      onPress={() => {
                        setActiveTab("events");
                        setSearchOpen(true);
                      }}
                      className="shrink-0 rounded-full"
                    >
                      <Icon as={Search} className="size-4 text-text-muted" />
                    </Button>
                    <Animated.View className="min-w-0 flex-1" style={searchInputStyle}>
                      <TextInput
                        ref={searchInputRef}
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t("Search events")}
                        className="h-11 min-w-0 flex-1 bg-transparent px-0 text-base leading-5 text-text"
                        placeholderTextColorClassName="accent-muted-foreground/50"
                        returnKeyType="search"
                      />
                    </Animated.View>
                    {searchExpanded ? (
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        accessibilityLabel={
                          search.length > 0 ? t("Clear search") : t("Close search")
                        }
                        onPress={() => {
                          if (search.length > 0) {
                            setSearch("");
                            setDebouncedSearch("");
                          } else {
                            setSearchOpen(false);
                            searchInputRef.current?.blur();
                          }
                        }}
                        className="shrink-0 rounded-full"
                      >
                        <Icon as={X} className="size-4 text-text-muted" />
                      </Button>
                    ) : null}
                  </View>
                </Animated.View>
              </View>
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
