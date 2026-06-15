import { SecretSantaEventCard } from "@/components/secret-santa/secret-santa-event-card";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { InlineState } from "@/components/shared/inline-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { useSecretSantaEvents } from "@/hooks/use-secret-santa";
import { SECRET_SANTA_PAGE_SIZE } from "@/lib/secret-santa";
import { chunkRows } from "@/lib/layout";
import type { SecretSantaListItem } from "@wishlist/backend/types/secret-santa";
import { Stack, useRouter } from "expo-router";
import { Plus, Search, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SecretSantaRow = SecretSantaListItem[];

export default function SecretSantaScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useSecretSantaEvents({
    search: debouncedSearch,
    limit: SECRET_SANTA_PAGE_SIZE,
    offset: 0,
  });
  const events = query.data?.items ?? [];
  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const rows = React.useMemo<SecretSantaRow[]>(() => chunkRows(events, columns), [columns, events]);

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
          data={query.isLoading || query.isError ? [] : rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.map((event) => event.id).join(":")}
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="pb-8"
          contentContainerStyle={{ paddingTop: insets.top + 24 }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListHeaderComponent={
            <View className="gap-5 self-center pb-8" style={{ width: contentWidth }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-2xl font-extrabold text-text">{t("Secret Santa")}</Text>
                </View>
                <Button onPress={() => setCreateOpen(true)} className="rounded-full">
                  <Icon as={Plus} className="size-4 text-primary-foreground" />
                  <Text>{t("New Event")}</Text>
                </Button>
              </View>

              <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3 shadow-sm">
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
                    className="size-9 rounded-full"
                  >
                    <Icon as={X} className="size-4 text-text-muted" />
                  </Button>
                ) : null}
              </View>
            </View>
          }
          ListFooterComponent={
            <View className="gap-4 self-center" style={{ width: contentWidth }}>
              {query.isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator colorClassName="accent-brand" />
                </View>
              ) : null}
              {query.isError ? (
                <InlineState message={t("Failed to load Secret Santa events.")} />
              ) : null}
              {!query.isLoading && !query.isError && events.length === 0 ? (
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
          extraData={{ cardWidth, contentWidth, gridGap, search: debouncedSearch }}
        />

        <SecretSantaCreateEditSheet mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      </View>
    </>
  );
}
