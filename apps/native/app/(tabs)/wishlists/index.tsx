import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWishlistSheet } from "@/components/wishlists/delete-wishlist-sheet";
import { WishlistFormSheet } from "@/components/wishlists/wishlist-form-sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useMyStatistics, useMyWishlists } from "@/hooks/use-wishlists";
import {
  DEFAULT_WISHLIST_SORT,
  WISHLIST_PAGE_SIZE,
  WISHLIST_SORT_OPTIONS,
  WISHLIST_VISIBILITY_ICONS,
  WISHLIST_VISIBILITY_LABELS,
  WISHLIST_VISIBILITY_MAP,
  WISHLIST_VISIBILITY_OPTIONS,
  getWishlistAccentClass,
  hasActiveFilters,
  paginationFlags,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import type { Wishlist, WishlistVisibility } from "@/types/wishlist";
import { Image as ExpoImage } from "expo-image";
import { Link, Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Gift,
  Link2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react-native";
import * as React from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

type SheetState =
  | { type: "create" }
  | { type: "edit"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

export default function WishlistsScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [visibility, setVisibility] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState(DEFAULT_WISHLIST_SORT);
  const [sheet, setSheet] = React.useState<SheetState>(null);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const visibilityTypes = React.useMemo(
    () =>
      visibility
        .map((value) => WISHLIST_VISIBILITY_MAP[value])
        .filter((value): value is WishlistVisibility => value !== undefined),
    [visibility],
  );
  const queryParams = React.useMemo(
    () => ({
      skip: (page - 1) * WISHLIST_PAGE_SIZE,
      take: WISHLIST_PAGE_SIZE,
      search: debouncedSearch,
      sort,
      visibilityTypes,
    }),
    [debouncedSearch, page, sort, visibilityTypes],
  );
  const query = useMyWishlists(queryParams);
  const wishlists = query.data ?? [];
  const filtersActive = hasActiveFilters(debouncedSearch, visibility);
  const pagination = paginationFlags(page, wishlists.length, WISHLIST_PAGE_SIZE);
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 22 : 16;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleVisibilityChange(value: string) {
    setVisibility((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setPage(1);
  }

  function handleResetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setVisibility([]);
    setSort(DEFAULT_WISHLIST_SORT);
    setPage(1);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Wishlists" }} />
      <View className="flex-1 bg-bg">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="items-center gap-6 px-4 pb-safe-offset-8 pt-6"
        >
          <View className="w-full gap-6" style={{ maxWidth: 1200 }}>
            <StatsRow />
            <View className="gap-5">
              <WishlistToolbar
                search={search}
                visibility={visibility}
                sort={sort}
                onSearchChange={handleSearchChange}
                onVisibilityChange={handleVisibilityChange}
                onSortChange={handleSortChange}
                onResetFilters={handleResetFilters}
                onCreateWishlist={() => setSheet({ type: "create" })}
              />

              {query.isLoading ? (
                <WishlistGridSkeleton cardWidth={cardWidth} gridGap={gridGap} />
              ) : (
                <Animated.View
                  className="flex-row flex-wrap"
                  layout={LinearTransition}
                  style={{ gap: gridGap, opacity: query.isFetching ? 0.6 : 1 }}
                >
                  {query.isError ? (
                    <InlineState width={contentWidth} message="Failed to load wishlists." />
                  ) : null}

                  {!query.isError && wishlists.length === 0 && filtersActive ? (
                    <InlineState width={contentWidth} message="No wishlists match your filters." />
                  ) : null}

                  {wishlists.map((wishlist) => (
                    <WishlistCard
                      key={wishlist.id}
                      wishlist={wishlist}
                      width={cardWidth}
                      onEdit={
                        wishlist.is_owner || wishlist.can_edit
                          ? () => setSheet({ type: "edit", wishlist })
                          : undefined
                      }
                      onDelete={
                        wishlist.is_owner ? () => setSheet({ type: "delete", wishlist }) : undefined
                      }
                    />
                  ))}

                  {!query.isError && wishlists.length > 0 ? (
                    <AddWishlistCard
                      width={cardWidth}
                      onPress={() => setSheet({ type: "create" })}
                    />
                  ) : null}
                </Animated.View>
              )}

              {pagination.showPagination ? (
                <PaginationControls
                  page={page}
                  total={pagination.totalForPagination}
                  hasPrevPage={pagination.hasPrevPage}
                  hasNextPage={pagination.hasNextPage}
                  onChange={setPage}
                />
              ) : null}
            </View>
          </View>
        </ScrollView>

        <WishlistFormSheet
          mode={sheet?.type === "edit" ? "edit" : "create"}
          open={sheet?.type === "create" || sheet?.type === "edit"}
          wishlist={sheet?.type === "edit" ? sheet.wishlist : undefined}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <DeleteWishlistSheet
          wishlist={sheet?.type === "delete" ? sheet.wishlist : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
      </View>
    </>
  );
}

function StatsRow() {
  const { width } = useWindowDimensions();
  const { data, isError, isLoading } = useMyStatistics();
  const gap = 12;
  const cardWidth = (Math.min(width - 32, 1200) - gap) / 2;
  const stats = [
    { label: "Wishlists", value: data?.wishlists_count ?? 0 },
    { label: "Total Items", value: data?.total_items_count ?? 0 },
    { label: "Reserved", value: data?.reserved_items_count ?? 0 },
    { label: "Purchased", value: data?.purchased_items_count ?? 0 },
  ];

  if (isLoading) {
    return (
      <View className="flex-row flex-wrap" style={{ gap }}>
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" style={{ width: cardWidth }} />
        ))}
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="rounded-xl border border-border-subtle bg-card-bg p-4">
        <Text className="text-sm text-destructive">Failed to load stats.</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
          style={{ width: cardWidth }}
        >
          <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={Gift} className="size-4 text-brand" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-extrabold text-text">{stat.value}</Text>
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function WishlistToolbar({
  search,
  visibility,
  sort,
  onSearchChange,
  onVisibilityChange,
  onSortChange,
  onResetFilters,
  onCreateWishlist,
}: {
  search: string;
  visibility: string[];
  sort: string;
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onResetFilters: () => void;
  onCreateWishlist: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const selectedSortLabel =
    WISHLIST_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Newest first";
  const selectedVisibilityLabel =
    visibility.length === 0
      ? "Visibility"
      : visibility.length === 1
        ? (WISHLIST_VISIBILITY_OPTIONS.find((option) => option.value === visibility[0])?.label ??
          "Visibility")
        : `${visibility.length} selected`;
  const canResetFilters =
    search.trim() !== "" || visibility.length > 0 || sort !== DEFAULT_WISHLIST_SORT;

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="text-xl font-extrabold tracking-tight text-text">Wishlists</Text>
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel="Show filters"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen((open) => !open)}
            className={cn(
              "h-11 w-11 min-w-11 shrink-0 rounded-full border-border-subtle bg-card-bg p-0 sm:h-11 sm:w-11 sm:min-w-11",
              filtersOpen && "border-brand bg-brand-lighter",
            )}
          >
            <Icon
              as={SlidersHorizontal}
              className={cn("size-4 text-text-muted", filtersOpen && "text-brand")}
            />
          </Button>
        </View>
        <Button
          size="lg"
          className="h-11 shrink-0 rounded-full px-4 shadow-brand sm:h-11"
          onPress={onCreateWishlist}
        >
          <Icon as={Plus} className="size-4 text-primary-foreground" />
          <Text>Add Wishlist</Text>
        </Button>
      </View>

      {filtersOpen ? (
        <View className="gap-3 sm:items-end">
          <View className="w-full flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3 shadow-sm sm:max-w-md">
            <Icon as={Search} className="size-4 text-text-muted" />
            <Input
              value={search}
              onChangeText={onSearchChange}
              placeholder="Search wishlists..."
              className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none"
              returnKeyType="search"
            />
          </View>

          <View className="w-full flex-row flex-wrap items-center justify-around gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Filter by visibility"
                  className={cn(
                    "h-10 flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3",
                    visibility.length > 0 && "border-brand bg-brand-lighter",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold text-text-muted",
                      visibility.length > 0 && "text-brand",
                    )}
                  >
                    {selectedVisibilityLabel}
                  </Text>
                  <Icon
                    as={ChevronsUpDown}
                    className={cn(
                      "size-3.5 text-text-muted",
                      visibility.length > 0 && "text-brand",
                    )}
                  />
                </AnimatedPressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-52">
                {WISHLIST_VISIBILITY_OPTIONS.map((option) => {
                  const selected = visibility.includes(option.value);
                  const VisibilityIcon = option.icon;

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selected}
                      closeOnPress={false}
                      onCheckedChange={() => onVisibilityChange(option.value)}
                    >
                      <Icon as={VisibilityIcon} className="size-3.5 text-popover-foreground" />
                      <Text>{option.label}</Text>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedPressable className="h-10 flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
                  <Text className="text-sm font-semibold text-text">{selectedSortLabel}</Text>
                  <Icon as={ChevronsUpDown} className="size-3.5 text-text-muted" />
                </AnimatedPressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-52">
                {WISHLIST_SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem key={option.value} onPress={() => onSortChange(option.value)}>
                    <Text>{option.label}</Text>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              disabled={!canResetFilters}
              onPress={onResetFilters}
              className="h-10 rounded-full border-border-subtle bg-card-bg px-3"
            >
              <Icon as={RotateCcw} className="size-3.5 text-text-muted" />
              <Text>Reset</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function WishlistGridSkeleton({ cardWidth, gridGap }: { cardWidth: number; gridGap: number }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: gridGap }}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
          style={{ width: cardWidth }}
        >
          <Skeleton className="h-[120px] rounded-none" />
          <View className="gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function WishlistCard({
  wishlist,
  width,
  onEdit,
  onDelete,
}: {
  wishlist: Wishlist;
  width: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const showMenu = Boolean(onEdit || onDelete);
  const isShared = wishlist.is_owner === false;
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedLabel = ownerNickname ? `Shared by @${ownerNickname}` : "Shared wishlist";

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ width }}>
      <Link href={{ pathname: "/wishlists/[id]", params: { id: wishlist.id } }} asChild>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${wishlist.title}`}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
          pressedScale={0.98}
        >
          <View
            className={cn(
              "h-[120px] items-center justify-center overflow-hidden",
              getWishlistAccentClass(wishlist.accent_type),
            )}
          >
            {wishlist.image_url ? (
              <Image
                source={{ uri: wishlist.image_url }}
                contentFit="cover"
                className="absolute inset-0 size-full"
              />
            ) : (
              <Icon as={Gift} className="size-10 text-white/85" />
            )}

            <View className="absolute inset-0 bg-black/10" />

            {isShared ? (
              <Badge
                variant="secondary"
                className="absolute left-3 top-3 flex-row border-white/30 bg-white/80"
                accessibilityLabel={sharedLabel}
              >
                <Icon as={Link2} className="size-3 text-text" />
                <Text className="text-xs font-bold text-text">Shared</Text>
              </Badge>
            ) : null}
          </View>

          <View className="gap-3 px-4 pb-4 pt-3">
            <View className="min-h-11 flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-[15px] font-bold leading-5 text-text" numberOfLines={2}>
                {wishlist.title}
              </Text>

              {showMenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <AnimatedPressable
                      accessibilityLabel="Wishlist actions"
                      className="size-10 items-center justify-center rounded-full active:bg-bg-muted"
                    >
                      <Icon as={MoreHorizontal} className="size-4 text-text-muted" />
                    </AnimatedPressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-36">
                    {onEdit ? (
                      <DropdownMenuItem onPress={onEdit}>
                        <Text>Edit</Text>
                      </DropdownMenuItem>
                    ) : null}
                    {onDelete ? (
                      <DropdownMenuItem variant="destructive" onPress={onDelete}>
                        <Text>Delete</Text>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </View>

            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm font-semibold text-text-muted">
                {itemsCount === 1 ? "1 item" : `${itemsCount} items`}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Icon as={VisibilityIcon} className="size-3.5 text-text-muted" />
                <Text className="text-sm font-semibold text-text-muted">
                  {WISHLIST_VISIBILITY_LABELS[visibility]}
                </Text>
              </View>
            </View>
          </View>
        </AnimatedPressable>
      </Link>
    </Animated.View>
  );
}

function AddWishlistCard({ width, onPress }: { width: number; onPress: () => void }) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Create wishlist"
      onPress={onPress}
      className="h-[196px] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-card-bg active:bg-bg-subtle"
      style={{ width }}
    >
      <View className="size-14 items-center justify-center rounded-full border border-dashed border-brand/50 bg-brand-lighter">
        <Icon as={Plus} className="size-7 text-brand" />
      </View>
    </AnimatedPressable>
  );
}

function InlineState({ width, message }: { width: number; message: string }) {
  return (
    <View
      className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6"
      style={{ width }}
    >
      <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
    </View>
  );
}

function PaginationControls({
  page,
  total,
  hasPrevPage,
  hasNextPage,
  onChange,
}: {
  page: number;
  total: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="icon"
        disabled={!hasPrevPage}
        onPress={() => onChange(Math.max(1, page - 1))}
      >
        <Icon as={ChevronLeft} className="size-4 text-text" />
      </Button>
      {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
        <Button
          key={item}
          variant={item === page ? "default" : "outline"}
          size="icon"
          onPress={() => onChange(item)}
        >
          <Text>{item}</Text>
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        disabled={!hasNextPage}
        onPress={() => onChange(page + 1)}
      >
        <Icon as={ChevronRight} className="size-4 text-text" />
      </Button>
    </View>
  );
}
