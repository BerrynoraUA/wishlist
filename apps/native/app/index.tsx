import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  useCreateWishlist,
  useDeleteWishlist,
  useMyStatistics,
  useMyWishlists,
  useUpdateWishlist,
} from "@/hooks/use-wishlists";
import {
  DEFAULT_WISHLIST_SORT,
  EMPTY_WISHLIST_FORM,
  WISHLIST_ACCENT_OPTIONS,
  WISHLIST_PAGE_SIZE,
  WISHLIST_SORT_OPTIONS,
  WISHLIST_VISIBILITY_ICONS,
  WISHLIST_VISIBILITY_LABELS,
  WISHLIST_VISIBILITY_MAP,
  WISHLIST_VISIBILITY_OPTIONS,
  getWishlistAccentClass,
  hasActiveFilters,
  paginationFlags,
  toWishlistFormValues,
} from "@/lib/wishlists";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Wishlist, WishlistFormValues, WishlistVisibility } from "@/types/wishlist";
import { Image as ExpoImage } from "expo-image";
import { Stack } from "expo-router";
import {
  CalendarDays,
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
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useCSSVariable, withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);
const SLIDING_SELECTOR_GAP = 8;
const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type ModalState =
  | { type: "create" }
  | { type: "edit"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

function parseDateFieldValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateFieldValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateFieldLabel(value: string) {
  const date = parseDateFieldValue(value);
  return date ? dateLabelFormatter.format(date) : "Select a date";
}

export default function WishlistsScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [visibility, setVisibility] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState(DEFAULT_WISHLIST_SORT);
  const [modal, setModal] = React.useState<ModalState>(null);

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
                onCreateWishlist={() => setModal({ type: "create" })}
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
                          ? () => setModal({ type: "edit", wishlist })
                          : undefined
                      }
                      onDelete={
                        wishlist.is_owner
                          ? () => setModal({ type: "delete", wishlist })
                          : undefined
                      }
                    />
                  ))}

                  {!query.isError && wishlists.length > 0 ? <AddWishlistCard width={cardWidth} onPress={() => setModal({ type: "create" })} /> : null}
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

        <WishlistFormDialog
          mode={modal?.type === "edit" ? "edit" : "create"}
          open={modal?.type === "create" || modal?.type === "edit"}
          wishlist={modal?.type === "edit" ? modal.wishlist : undefined}
          onOpenChange={(open) => {
            if (!open) setModal(null);
          }}
        />
        <DeleteWishlistDialog
          wishlist={modal?.type === "delete" ? modal.wishlist : null}
          onOpenChange={(open) => {
            if (!open) setModal(null);
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
        <Text className="text-xl font-extrabold tracking-tight text-text">Wishlists</Text>
        <View className="flex-row items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            accessibilityLabel="Show filters"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen((open) => !open)}
            className={cn(
              "h-10 w-10 rounded-full border-border-subtle bg-card-bg",
              filtersOpen && "border-brand bg-brand-lighter",
            )}
          >
            <Icon
              as={SlidersHorizontal}
              className={cn("size-4 text-text-muted", filtersOpen && "text-brand")}
            />
          </Button>
          <Button className="h-10 rounded-full px-4 shadow-brand" onPress={onCreateWishlist}>
            <Icon as={Plus} className="size-4 text-primary-foreground" />
            <Text>Add Wishlist</Text>
          </Button>
        </View>
      </View>

      {filtersOpen ? <View className="gap-3 sm:items-end">
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
                  className={cn("size-3.5 text-text-muted", visibility.length > 0 && "text-brand")}
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
      </View> : null}
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
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${wishlist.title}`}
        className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
        pressedScale={0.98}
      >
        <View className={cn("h-[120px] items-center justify-center overflow-hidden", getWishlistAccentClass(wishlist.accent_type))}>
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
    <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6" style={{ width }}>
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

function WishlistFormDialog({
  mode,
  open,
  wishlist,
  onOpenChange,
}: {
  mode: "create" | "edit";
  open: boolean;
  wishlist?: Wishlist;
  onOpenChange: (open: boolean) => void;
}) {
  const { height, width } = useWindowDimensions();
  const dialogBackground = useCSSVariable("--color-bg-elevated") as string | undefined;
  const createMutation = useCreateWishlist();
  const updateMutation = useUpdateWishlist();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const [values, setValues] = React.useState<WishlistFormValues>(EMPTY_WISHLIST_FORM);

  React.useEffect(() => {
    if (open) setValues(toWishlistFormValues(wishlist));
  }, [open, wishlist]);

  function patchValues(patch: Partial<WishlistFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit() {
    if (!values.title.trim()) return;

    if (mode === "edit" && wishlist) {
      updateMutation.mutate(
        { id: wishlist.id, values },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="items-end justify-end p-0"
        contentContainerClassName="w-full"
        contentEntering={SlideInDown.duration(280)}
        contentExiting={SlideOutDown.duration(200)}
        className="mx-0 max-w-none overflow-hidden rounded-b-none rounded-t-[28px] border-border-light bg-bg-elevated p-0 shadow-modal sm:max-w-none"
        style={{
          backgroundColor: dialogBackground,
          maxHeight: height * 0.94,
          width,
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            className="bg-bg-elevated"
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-5 px-5 pb-safe-offset-5 pt-5"
          >
            <DialogHeader>
              <DialogTitle>{mode === "edit" ? "Edit Wishlist" : "Create Wishlist"}</DialogTitle>
            </DialogHeader>

            <View className="gap-4">
              <Field label="Name">
                <Input
                  value={values.title}
                  onChangeText={(title) => patchValues({ title })}
                  placeholder="Birthday gifts"
                />
              </Field>

              <Field label="Description">
                <Input
                  value={values.description}
                  onChangeText={(description) => patchValues({ description })}
                  placeholder="A short note about this wishlist"
                  multiline
                  className="h-24 items-start py-3"
                  textAlignVertical="top"
                />
              </Field>

              <Field label="Visibility">
                <VisibilitySelector
                  value={values.visibility}
                  onChange={(visibility) => patchValues({ visibility })}
                />
              </Field>

              <Field label="Accent">
                <AccentSelector value={values.accent} onChange={(accent) => patchValues({ accent })} />
              </Field>

              <Field label="Event date (optional)">
                <EventDatePicker
                  value={values.eventDate}
                  onChange={(eventDate) => patchValues({ eventDate })}
                />
              </Field>

              <Field label="Image URL">
                <Input
                  value={values.imageUrl}
                  onChangeText={(imageUrl) => patchValues({ imageUrl })}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </Field>

              {error ? <Text className="text-sm font-semibold text-destructive">{error.message}</Text> : null}
            </View>

            <DialogFooter>
              <Button variant="outline" disabled={isPending} onPress={() => onOpenChange(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button disabled={isPending || !values.title.trim()} onPress={handleSubmit}>
                {isPending ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
                <Text>{mode === "edit" ? "Save changes" : "Create wishlist"}</Text>
              </Button>
            </DialogFooter>
          </ScrollView>
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}

type SlidingSelectorOption<T extends number | string> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
  icon?: LucideIcon;
  colorClassName?: string;
};

function SlidingOptionSelector<T extends number | string>({
  rows,
  value,
  onChange,
  optionHeight,
  optionHeightClassName,
  optionClassName,
  selectedOptionClassName,
  indicatorClassName,
  textClassName,
  selectedTextClassName = "text-brand",
  iconClassName,
  selectedIconClassName = "text-brand",
}: {
  rows: SlidingSelectorOption<T>[][];
  value: T;
  onChange: (value: T) => void;
  optionHeight: number;
  optionHeightClassName: string;
  optionClassName: string;
  selectedOptionClassName?: string;
  indicatorClassName: string;
  textClassName: string;
  selectedTextClassName?: string;
  iconClassName?: string;
  selectedIconClassName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [rowWidth, setRowWidth] = React.useState(0);
  const selectedPosition = React.useMemo(() => {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const columnIndex = rows[rowIndex].findIndex((option) => option.value === value);

      if (columnIndex >= 0) {
        return { rowIndex, columnIndex };
      }
    }

    return { rowIndex: 0, columnIndex: 0 };
  }, [rows, value]);
  const selectedRowLength = rows[selectedPosition.rowIndex]?.length ?? 1;
  const selectedOptionWidth =
    rowWidth > 0
      ? (rowWidth - SLIDING_SELECTOR_GAP * (selectedRowLength - 1)) / selectedRowLength
      : 0;
  const indicatorX = useSharedValue(0);
  const indicatorY = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  React.useEffect(() => {
    const targetX =
      selectedPosition.columnIndex * (selectedOptionWidth + SLIDING_SELECTOR_GAP);
    const targetY = selectedPosition.rowIndex * (optionHeight + SLIDING_SELECTOR_GAP);

    indicatorX.value = reduceMotion ? targetX : withSpring(targetX, motionSpring.navPill);
    indicatorY.value = reduceMotion ? targetY : withSpring(targetY, motionSpring.navPill);
    indicatorWidth.value = reduceMotion
      ? selectedOptionWidth
      : withSpring(selectedOptionWidth, motionSpring.navPill);
  }, [
    indicatorWidth,
    indicatorX,
    indicatorY,
    optionHeight,
    reduceMotion,
    selectedOptionWidth,
    selectedPosition.columnIndex,
    selectedPosition.rowIndex,
  ]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }, { translateY: indicatorY.value }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    setRowWidth((current) => (current === nextWidth ? current : nextWidth));
  }

  return (
    <View className="relative gap-2" onLayout={handleLayout}>
      {selectedOptionWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          className={cn("absolute left-0 top-0", indicatorClassName)}
          style={[{ height: optionHeight }, indicatorStyle]}
        />
      ) : null}

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-2">
          {row.map((option) => {
            const selected = value === option.value;

            return (
              <AnimatedPressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.accessibilityLabel}
                onPress={() => onChange(option.value)}
                className={cn(
                  "z-10 flex-1 flex-row items-center justify-center border border-border-subtle bg-bg-subtle",
                  optionHeightClassName,
                  optionClassName,
                  selected && "border-transparent bg-transparent",
                  selected && selectedOptionClassName,
                )}
              >
                {option.icon ? (
                  <Icon
                    as={option.icon}
                    className={cn(iconClassName, selected && selectedIconClassName)}
                  />
                ) : (
                  <View className={cn("size-4 rounded-full", option.colorClassName)} />
                )}
                <Text
                  className={cn(textClassName, selected && selectedTextClassName)}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function VisibilitySelector({
  value,
  onChange,
}: {
  value: WishlistFormValues["visibility"];
  onChange: (visibility: WishlistFormValues["visibility"]) => void;
}) {
  const rows = React.useMemo(
    () => [
      WISHLIST_VISIBILITY_OPTIONS.map((option) => ({
        value: option.visibility,
        label: option.label,
        icon: option.icon,
      })),
    ],
    [],
  );

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={44}
      optionHeightClassName="h-11"
      optionClassName="gap-1.5 rounded-lg px-2"
      indicatorClassName="rounded-lg border border-brand bg-brand-lighter"
      textClassName="text-xs font-semibold text-text"
      iconClassName="size-3.5 text-text-muted"
    />
  );
}

function AccentSelector({
  value,
  onChange,
}: {
  value: WishlistFormValues["accent"];
  onChange: (accent: WishlistFormValues["accent"]) => void;
}) {
  const rows = React.useMemo(() => {
    const options = WISHLIST_ACCENT_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      accessibilityLabel: `Use ${option.label} accent`,
      colorClassName: getWishlistAccentClass(option.value),
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, []);

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="gap-2 rounded-full px-3"
      indicatorClassName="rounded-full border border-brand bg-brand-lighter"
      textClassName="text-sm font-semibold text-text-muted"
    />
  );
}

function EventDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed" || !selectedDate) return;

    onChange(formatDateFieldValue(selectedDate));
  }

  function handleOpenPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        display: "calendar",
        onChange: handleDateChange,
      });
      return;
    }

    setIosPickerOpen((open) => !open);
  }

  return (
    <View className="gap-2">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Select event date"
        onPress={handleOpenPicker}
        className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle px-3"
      >
        <Icon as={CalendarDays} className="size-4 text-text-muted" />
        <View className="min-w-0 flex-1">
          <Text className={cn("font-semibold", value ? "text-text" : "text-text-muted")}>
            {formatDateFieldLabel(value)}
          </Text>
          {value ? <Text className="text-xs font-semibold text-text-muted">{value}</Text> : null}
        </View>
        {value ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Clear event date"
            onPress={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            className="size-8 items-center justify-center rounded-full bg-bg-muted"
          >
            <Icon as={X} className="size-3.5 text-text-muted" />
          </AnimatedPressable>
        ) : null}
      </AnimatedPressable>

      {Platform.OS === "ios" && iosPickerOpen ? (
        <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-subtle">
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      ) : null}
    </View>
  );
}

function DeleteWishlistDialog({
  wishlist,
  onOpenChange,
}: {
  wishlist: Wishlist | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { height, width } = useWindowDimensions();
  const dialogBackground = useCSSVariable("--color-bg-elevated") as string | undefined;
  const mutation = useDeleteWishlist();
  const open = Boolean(wishlist);

  function handleDelete() {
    if (!wishlist) return;

    mutation.mutate(wishlist.id, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-border-light bg-bg-elevated shadow-modal"
        style={{
          backgroundColor: dialogBackground,
          maxHeight: height * 0.86,
          width: Math.min(width - 20, 520),
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete Wishlist</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this entire wishlist and all its items? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {mutation.error ? (
          <Text className="text-sm font-semibold text-destructive">{mutation.error.message}</Text>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onPress={handleDelete}>
            {mutation.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Icon as={Trash2} className="size-4 text-white" />
            <Text>Delete Wishlist</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-text">{label}</Text>
      {children}
    </View>
  );
}
