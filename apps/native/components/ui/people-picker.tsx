import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { getFriendGroupColorClass, getFriendGroupIcon } from "@/lib/friend-groups";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Search, UserPlus, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View, type TextInput } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// The footer always reserves the selection rail so its native height, search field, and
// buttons do not move when the first person is picked. Its surface starts below that
// reserved space until there is a selection, then slides up behind the rail.
const COLLAPSED_FOOTER_SURFACE_OFFSET = 80;

export type PeoplePickerItem = {
  id: string;
  /** Primary line, already resolved to something displayable. */
  name: string;
  /** Secondary line — a handle, a member count, whatever fits the context. */
  subtitle?: string | null;
  /** Additional text matched by client-side search but not displayed. */
  searchText?: string | null;
  avatarUrl?: string | null;
  /** Renders a coloured group tile instead of a person avatar. */
  group?: { icon: string; color: string };
};

type PeoplePickerSource = {
  items: PeoplePickerItem[];
  selected: PeoplePickerItem[];
  onChange: (selected: PeoplePickerItem[]) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  /**
   * Set when `items` is the full client-side list, so the search field filters it here.
   * Leave off when the query is already sent to the server — filtering twice would drop
   * rows that matched on a field this list does not display.
   */
  localFilter?: boolean;
  /** Replaces the result list, e.g. "Type at least 3 characters." */
  hint?: string | null;
  /**
   * Opens the sheet with the keyboard up. Only for sources that show nothing until
   * something is typed — otherwise the keyboard covers a list the user wanted to read.
   */
  autoFocusSearch?: boolean;
  /** Radio-style: picking a row replaces the selection and closes the sheet. */
  single?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorLabel?: string;
  isFetchingMore?: boolean;
  onEndReached?: () => void;
};

/**
 * One picker for every "add people" flow in the app — group members, friend invites,
 * Secret Santa participants, wishlist access.
 *
 * The host form only shows a trigger row plus a rail of who is already picked; the
 * searching happens in a full-height sheet stacked on top. That split is what keeps the
 * keyboard out of the way: an inline list inside a content-sized sheet gets covered as
 * soon as the field takes focus, whereas the picker sheet owns the whole screen and
 * TrueSheet floats its footer above the keyboard.
 *
 * Inside the sheet, two behaviours matter more than the looks (both borrowed from
 * WhatsApp's new-group screen and Slack's "add people to channel"):
 *
 * - Picked rows stay in the list with a checkmark instead of disappearing into a chip
 *   pile, so the list never jumps under the finger and a mistake is undone in place.
 * - The rail is fixed-height and scrolls sideways, so selecting people cannot reflow
 *   the layout the way wrapping chips did.
 */
export function PeoplePickerField({
  label,
  title,
  addLabel,
  className,
  ...source
}: PeoplePickerSource & {
  /** Section heading above the trigger. */
  label?: string;
  /** Sheet title. */
  title: string;
  /** Trigger row text. */
  addLabel: string;
  className?: string;
}) {
  const t = useGT();
  const [isOpen, setIsOpen] = React.useState(false);
  const { selected, onChange, onQueryChange } = source;

  function remove(item: PeoplePickerItem) {
    onChange(selected.filter((current) => current.id !== item.id));
  }

  return (
    <View className={cn("gap-3", className)}>
      {label ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-bold text-text">{label}</Text>
          {selected.length > 0 ? (
            <Text className="text-sm font-semibold text-text-muted">
              {t("{count} selected", { count: selected.length })}
            </Text>
          ) : null}
        </View>
      ) : null}

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        pressedScale={0.99}
        onPress={() => setIsOpen(true)}
        className="min-h-12 flex-row items-center gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2"
      >
        <View className="size-8 items-center justify-center rounded-full bg-brand-lighter">
          <Icon as={UserPlus} className="size-4 text-brand" />
        </View>
        <Text className="min-w-0 flex-1 font-semibold text-text">{addLabel}</Text>
        <Icon as={ChevronRight} className="size-4 text-text-muted" />
      </AnimatedPressable>

      <SelectionRail selected={selected} onRemove={remove} />

      {isOpen ? (
        <PeoplePickerSheet
          {...source}
          title={title}
          onClose={() => {
            setIsOpen(false);
            // The next open should start from the unfiltered list rather than whatever
            // was typed last time — and for server-backed sources, stop refetching it.
            onQueryChange("");
          }}
        />
      ) : null}
    </View>
  );
}

function PeoplePickerSheet({
  title,
  onClose,
  items,
  selected,
  onChange,
  query,
  onQueryChange,
  searchPlaceholder,
  emptyLabel,
  localFilter = false,
  hint,
  autoFocusSearch = false,
  single = false,
  isLoading = false,
  isError = false,
  errorLabel,
  isFetchingMore = false,
  onEndReached,
}: PeoplePickerSource & { title: string; onClose: () => void }) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const searchInputRef = React.useRef<TextInput>(null);
  // Edited as a draft so Cancel — and a swipe-down, which is the same gesture — leaves
  // the host form exactly as it was.
  const [draft, setDraft] = React.useState(selected);
  const draftIds = React.useMemo(() => new Set(draft.map((item) => item.id)), [draft]);
  const hasDraftSelection = draft.length > 0;
  const previousDraftCountRef = React.useRef(draft.length);
  const reduceMotion = useReducedMotion();
  const firstSelectionRevealDelay =
    !reduceMotion && previousDraftCountRef.current === 0 && hasDraftSelection
      ? motionDuration.normal
      : 0;
  const footerSurfaceOffset = useSharedValue(
    hasDraftSelection ? 0 : COLLAPSED_FOOTER_SURFACE_OFFSET,
  );
  const footerSurfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: footerSurfaceOffset.value }],
  }));

  React.useEffect(() => {
    // Some hosts load their initial selection after this sheet opens. Keep the draft in
    // sync with those external updates; edits made here remain local until `commit`.
    setDraft(selected);
  }, [selected]);

  React.useEffect(() => {
    const nextOffset = hasDraftSelection ? 0 : COLLAPSED_FOOTER_SURFACE_OFFSET;
    footerSurfaceOffset.value = reduceMotion
      ? nextOffset
      : withTiming(nextOffset, { duration: motionDuration.normal });
  }, [footerSurfaceOffset, hasDraftSelection, reduceMotion]);

  React.useEffect(() => {
    previousDraftCountRef.current = draft.length;
  }, [draft.length]);

  const visibleItems = React.useMemo(() => {
    if (!localFilter) return items;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      `${item.name} ${item.searchText ?? ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [items, localFilter, query]);

  function commit(next: PeoplePickerItem[]) {
    onChange(next);
    void sheetRef.current?.dismiss();
  }

  function toggle(item: PeoplePickerItem) {
    // A single-select picker has nothing left to confirm once a row is tapped.
    if (single) {
      commit([item]);
      return;
    }

    setDraft((current) =>
      draftIds.has(item.id)
        ? current.filter((selectedItem) => selectedItem.id !== item.id)
        : [...current, item],
    );
  }

  function removeFromDraft(item: PeoplePickerItem) {
    setDraft((current) => current.filter((selectedItem) => selectedItem.id !== item.id));
  }

  const showsResults = !hint && !isLoading && !isError;
  const emptyState = hint ? (
    <PickerStatus label={hint} />
  ) : isLoading ? (
    <View className="items-center py-6">
      <ActivityIndicator colorClassName="accent-brand" />
    </View>
  ) : isError ? (
    <PickerStatus label={errorLabel ?? t("Something went wrong.")} tone="destructive" />
  ) : (
    <PickerStatus label={emptyLabel} />
  );

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      // Single detent: this sheet exists to be full screen, and `auto` cannot be combined
      // with `scrollable` anyway.
      detents={[0.94]}
      scrollableOptions={{ keyboardScrollOffset: 16 }}
      dismissKeyboardOnTouch={false}
      // Focusing on present rather than with `autoFocus`, which TrueSheet does not
      // support inside a sheet.
      onDidPresent={autoFocusSearch ? () => searchInputRef.current?.focus() : undefined}
      onDidDismiss={onClose}
      header={
        <BottomSheetHeader
          title={title}
          action={
            !single && draft.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                accessibilityLabel={t("Clear selection")}
                onPress={() => setDraft([])}
                className="h-8 rounded-full px-2"
              >
                <Text className="text-xs font-bold text-brand">
                  {t("{count} selected", { count: draft.length })}
                </Text>
                <Icon as={X} className="size-3 text-brand" />
              </Button>
            ) : null
          }
        />
      }
      footer={
        // TrueSheet lifts the whole footer above the keyboard, so the running selection,
        // the search field and the actions all stay reachable while typing.
        // Its measured height stays fixed while only the surface moves; this avoids the
        // native footer resize that otherwise makes the pinned controls jitter.
        <View className="relative w-full gap-3 overflow-hidden px-5 pb-3 pt-3">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 border-t border-border-subtle bg-bg-elevated"
            style={footerSurfaceStyle}
          />
          <SelectionRail
            selected={draft}
            onRemove={removeFromDraft}
            reserveSpace
            enteringDelay={firstSelectionRevealDelay}
          />

          <View className="flex-row items-center gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
            <Icon as={Search} className="size-4 text-muted-foreground/50" />
            <Input
              ref={searchInputRef}
              value={query}
              onChangeText={onQueryChange}
              placeholder={searchPlaceholder}
              autoCapitalize="none"
              // Looks up other people, so no autofill — and no yellow overlay for it.
              autoComplete="off"
              importantForAutofill="no"
              className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t("Clear search")}
                onPress={() => onQueryChange("")}
                className="size-9 shrink-0 rounded-full"
              >
                <Icon as={X} className="size-4 text-destructive" />
              </Button>
            ) : null}
          </View>

          <View className="flex-row items-stretch gap-2">
            <Button
              className="min-w-0 flex-1"
              variant="outline"
              onPress={() => void sheetRef.current?.dismiss()}
            >
              <Text>{t("Cancel")}</Text>
            </Button>
            <Button className="min-w-0 flex-1" onPress={() => commit(draft)}>
              <Text>{t("Done")}</Text>
            </Button>
          </View>
        </View>
      }
    >
      <StyledFlashList
        data={showsResults ? visibleItems : []}
        renderItem={({ item }) => (
          <PersonRow item={item} selected={draftIds.has(item.id)} onPress={() => toggle(item)} />
        )}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="px-5"
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={PickerRowSeparator}
        ListEmptyComponent={emptyState}
        onEndReached={showsResults && visibleItems.length > 0 ? onEndReached : undefined}
        onEndReachedThreshold={0.1}
        isLoadingMore={showsResults && isFetchingMore}
      />
    </BottomSheet>
  );
}

function PickerRowSeparator() {
  return <View className="h-2" />;
}

function PersonRow({
  item,
  selected,
  onPress,
}: {
  item: PeoplePickerItem;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      role="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.name}
      pressedScale={0.98}
      onPress={onPress}
      className={cn(
        "min-h-14 flex-row items-center gap-3 rounded-xl border border-border-subtle bg-transparent px-3 py-2",
        selected && "border-brand bg-brand-lighter",
      )}
    >
      <PeopleAvatar item={item} className="size-9" />
      <View className="min-w-0 flex-1">
        <Text className={cn("font-bold text-text", selected && "text-brand")} numberOfLines={1}>
          {item.name}
        </Text>
        {item.subtitle ? (
          <Text className="text-sm text-text-muted" numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <View
        className={cn(
          "size-6 items-center justify-center rounded-full border-2 border-border-light",
          selected && "border-brand bg-brand",
        )}
      >
        {selected ? <Icon as={Check} className="size-3.5 text-primary-foreground" /> : null}
      </View>
    </AnimatedPressable>
  );
}

function SelectionRail({
  selected,
  onRemove,
  reserveSpace = false,
  enteringDelay = 0,
}: {
  selected: PeoplePickerItem[];
  onRemove: (item: PeoplePickerItem) => void;
  reserveSpace?: boolean;
  enteringDelay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (selected.length === 0 && !reserveSpace) return null;

  return (
    <Animated.View
      layout={
        reduceMotion || reserveSpace ? undefined : LinearTransition.duration(motionDuration.fast)
      }
      entering={reduceMotion || reserveSpace ? undefined : FadeIn.duration(motionDuration.fast)}
      exiting={reduceMotion || reserveSpace ? undefined : FadeOut.duration(motionDuration.fast)}
      className={reserveSpace ? "h-[68px] shrink-0" : undefined}
    >
      {selected.length > 0 ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-0.5"
        >
          {selected.map((item) => (
            <SelectedPerson
              key={item.id}
              item={item}
              onRemove={() => onRemove(item)}
              enteringDelay={enteringDelay}
            />
          ))}
        </ScrollView>
      ) : null}
    </Animated.View>
  );
}

function SelectedPerson({
  item,
  onRemove,
  enteringDelay = 0,
}: {
  item: PeoplePickerItem;
  onRemove: () => void;
  enteringDelay?: number;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(motionDuration.fast)}
      entering={
        reduceMotion ? undefined : FadeIn.delay(enteringDelay).duration(motionDuration.fast)
      }
      exiting={reduceMotion ? undefined : FadeOut.duration(motionDuration.fast)}
      className="w-16 items-center gap-1"
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Remove {name}", { name: item.name })}
        pressedScale={0.94}
        onPress={onRemove}
        className="p-0.5"
      >
        <PeopleAvatar item={item} className="size-12" />
        {/* Solid fill: a translucent badge disappeared against colored group tiles. */}
        <View className="absolute end-0 top-0 size-5 items-center justify-center rounded-full border-2 border-bg-elevated bg-destructive">
          <Icon as={X} className="size-3 text-white" />
        </View>
      </AnimatedPressable>
      <Text className="text-center text-[11px] font-semibold text-text-muted" numberOfLines={1}>
        {item.name}
      </Text>
    </Animated.View>
  );
}

/**
 * Person avatar or group tile. Exported so lists that sit next to a picker (existing
 * wishlist access, for one) can render the same leading slot.
 */
export function PeopleAvatar({
  item,
  className,
}: {
  item: Pick<PeoplePickerItem, "name" | "avatarUrl" | "group">;
  className?: string;
}) {
  if (item.group) {
    const colorClassName = getFriendGroupColorClass(item.group.color);

    return (
      <View
        className={cn(
          "size-9 shrink-0 items-center justify-center rounded-full",
          colorClassName.surface,
          className,
        )}
      >
        <Icon
          as={getFriendGroupIcon(item.group.icon)}
          className={cn("size-4", colorClassName.icon)}
        />
      </View>
    );
  }

  return (
    <Avatar className={cn("size-9", className)} alt={item.name}>
      {item.avatarUrl ? <AvatarImage source={{ uri: item.avatarUrl }} /> : null}
      <AvatarFallback className="bg-brand-lighter" initialsClassName="text-sm text-brand" />
    </Avatar>
  );
}

function PickerStatus({ label, tone }: { label: string; tone?: "destructive" }) {
  return (
    <Text
      className={cn(
        "rounded-xl bg-bg-muted p-3 text-sm font-semibold",
        tone === "destructive" ? "text-destructive" : "text-text-muted",
      )}
    >
      {label}
    </Text>
  );
}
