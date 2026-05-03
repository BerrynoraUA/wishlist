import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { usePatchWishlist } from "@/hooks/use-wishlists";
import { getThemeMode } from "@/lib/theme";
import {
  WISHLIST_VISIBILITY_ICONS,
  WISHLIST_VISIBILITY_LABELS,
  WISHLIST_VISIBILITY_OPTIONS,
  getWishlistAccentGradientColors,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import type { Wishlist, WishlistVisibility } from "@wishlist/backend/types/wishlist";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Calendar,
  ChevronDown,
  Gift,
  KeyRound,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useUniwind } from "uniwind";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDateLabel(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function toDateFieldValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WishlistItemHeader({
  wishlist,
  isOwner,
  onEdit,
  onDelete,
  onShare,
  onManageAccess,
}: {
  wishlist: Wishlist;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onManageAccess?: () => void;
}) {
  const patchWishlist = usePatchWishlist();
  const [titleDraft, setTitleDraft] = React.useState(wishlist.title);
  const [descriptionDraft, setDescriptionDraft] = React.useState(wishlist.description ?? "");
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [iosDateOpen, setIosDateOpen] = React.useState(false);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const eventDate = wishlist.event_date;
  const canInlineEdit = isOwner;
  const { theme } = useUniwind();
  const mode = getThemeMode(theme);
  const accentGradientColors = getWishlistAccentGradientColors(wishlist.accent_type, mode);

  React.useEffect(() => {
    if (!editingTitle) setTitleDraft(wishlist.title);
  }, [editingTitle, wishlist.title]);

  React.useEffect(() => {
    if (!editingDescription) setDescriptionDraft(wishlist.description ?? "");
  }, [editingDescription, wishlist.description]);

  function saveTitle() {
    const nextTitle = titleDraft.trim();
    setEditingTitle(false);
    if (!nextTitle || nextTitle === wishlist.title || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { title: nextTitle } });
  }

  function saveDescription() {
    const nextDescription = descriptionDraft.trim();
    setEditingDescription(false);
    if (nextDescription === (wishlist.description ?? "") || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { description: nextDescription } });
  }

  function updateVisibility(nextVisibility: WishlistVisibility) {
    if (nextVisibility === wishlist.visibility_type || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { visibility: nextVisibility } });
  }

  function updateEventDate(date: Date | null) {
    if (patchWishlist.isPending) return;
    patchWishlist.mutate({
      id: wishlist.id,
      values: { eventDate: date ? toDateFieldValue(date) : null },
    });
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed" || !selectedDate) return;
    updateEventDate(selectedDate);
  }

  function openDatePicker() {
    if (!canInlineEdit) return;
    const date = eventDate ? new Date(eventDate) : new Date();

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: Number.isNaN(date.getTime()) ? new Date() : date,
        mode: "date",
        display: "calendar",
        onChange: handleDateChange,
      });
      return;
    }

    setIosDateOpen((open) => !open);
  }

  return (
    <View className="w-full self-stretch border-b border-border-subtle bg-gradient-header">
      <View className="overflow-visible px-4 py-4">
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <AnimatedPressable
              accessibilityRole={canInlineEdit ? "button" : "image"}
              accessibilityLabel={canInlineEdit ? "Edit wishlist image" : wishlist.title}
              onPress={canInlineEdit ? onEdit : undefined}
              className="relative size-[70px] items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-white/70 shadow-lg"
            >
              <LinearGradient
                colors={accentGradientColors}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {wishlist.image_url ? (
                <StyledImage
                  source={{ uri: wishlist.image_url }}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                />
              ) : (
                <Icon as={Gift} className="size-7 text-white" />
              )}
            </AnimatedPressable>

            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <View className="min-w-0 flex-1">
                {editingTitle ? (
                  <Input
                    autoFocus
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    onBlur={saveTitle}
                    returnKeyType="done"
                    onSubmitEditing={saveTitle}
                    className="h-11 rounded-xl border-input-focus-border bg-card-bg text-xl font-extrabold"
                  />
                ) : (
                  <AnimatedPressable
                    disabled={!canInlineEdit}
                    accessibilityRole={canInlineEdit ? "button" : "text"}
                    accessibilityLabel={canInlineEdit ? "Edit wishlist title" : wishlist.title}
                    onPress={() => setEditingTitle(true)}
                  >
                    <Text className="text-xl font-extrabold leading-6 text-text" numberOfLines={2}>
                      {wishlist.title}
                    </Text>
                  </AnimatedPressable>
                )}

                {editingDescription ? (
                  <Input
                    autoFocus
                    value={descriptionDraft}
                    onChangeText={setDescriptionDraft}
                    onBlur={saveDescription}
                    multiline
                    className="mt-2 h-20 rounded-xl border-input-focus-border bg-card-bg text-sm"
                    textAlignVertical="top"
                  />
                ) : wishlist.description || canInlineEdit ? (
                  <AnimatedPressable
                    disabled={!canInlineEdit}
                    accessibilityRole={canInlineEdit ? "button" : "text"}
                    accessibilityLabel="Edit wishlist description"
                    onPress={() => setEditingDescription(true)}
                  >
                    <Text className="mt-2 text-sm leading-5 text-text-muted" numberOfLines={3}>
                      {wishlist.description || "Add a short description"}
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>

              {onEdit || onDelete ? (
                <View className="items-center gap-2">
                  {onEdit ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit wishlist"
                      onPress={onEdit}
                      className="size-8 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
                    >
                      <Icon as={Pencil} className="size-3.5 text-text" />
                    </AnimatedPressable>
                  ) : null}

                  {onDelete ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete wishlist"
                      onPress={onDelete}
                      className="size-8 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10"
                    >
                      <Icon as={Trash2} className="size-3.5 text-destructive" />
                    </AnimatedPressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
              {canInlineEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <AnimatedPressable className="h-8 flex-row items-center gap-1 rounded-full bg-brand-alpha-12 px-3">
                      <Icon as={VisibilityIcon} className="size-3.5 text-brand" />
                      <Text className="text-xs font-bold text-brand">
                        {WISHLIST_VISIBILITY_LABELS[visibility]}
                      </Text>
                      <Icon as={ChevronDown} className="size-3 text-brand" />
                    </AnimatedPressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-48">
                    {WISHLIST_VISIBILITY_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        className={cn(option.surfaceClassName, option.itemClassName)}
                        onPress={() => updateVisibility(option.visibility)}
                      >
                        <Icon as={option.icon} className="size-4 text-popover-foreground" />
                        <Text>{option.label}</Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <View className="h-8 flex-row items-center gap-1 rounded-full bg-brand-alpha-12 px-3">
                  <Icon as={VisibilityIcon} className="size-3.5 text-brand" />
                  <Text className="text-xs font-bold text-brand">
                    {WISHLIST_VISIBILITY_LABELS[visibility]}
                  </Text>
                </View>
              )}

              <View className="h-8 justify-center rounded-full bg-badge-count-bg px-3">
                <Text className="text-xs font-bold text-text-muted">
                  {itemsCount === 1 ? "1 item" : `${itemsCount} items`}
                </Text>
              </View>

              {eventDate || canInlineEdit ? (
                eventDate && canInlineEdit ? (
                  <View className="flex-row items-center rounded-full bg-info-bg pl-3 pr-1">
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Wishlist event date"
                      onPress={openDatePicker}
                      className="h-8 flex-row items-center gap-1 pr-2"
                    >
                      <Icon as={Calendar} className="size-3.5 text-info" />
                      <Text className="text-xs font-bold text-info" numberOfLines={1}>
                        {formatDateLabel(eventDate)}
                      </Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear date"
                      onPress={() => updateEventDate(null)}
                      className="size-8 items-center justify-center rounded-full"
                    >
                      <Icon as={X} className="size-3.5 text-text-muted" />
                    </AnimatedPressable>
                  </View>
                ) : (
                  <AnimatedPressable
                    accessibilityRole={canInlineEdit ? "button" : "text"}
                    accessibilityLabel={eventDate ? "Wishlist event date" : "Add date"}
                    onPress={openDatePicker}
                    className="h-8 flex-row items-center gap-1 rounded-full bg-info-bg px-3"
                  >
                    <Icon as={Calendar} className="size-3.5 text-info" />
                    <Text className="text-xs font-bold text-info">
                      {eventDate ? formatDateLabel(eventDate) : "Add date"}
                    </Text>
                  </AnimatedPressable>
                )
              ) : null}
            </View>
          </View>

          {Platform.OS === "ios" && iosDateOpen ? (
            <View className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg">
              <DateTimePicker
                value={eventDate ? new Date(eventDate) : new Date()}
                mode="date"
                display="inline"
                onChange={handleDateChange}
              />
            </View>
          ) : null}

          {onShare || (isOwner && onManageAccess) ? (
            <View className="flex-row items-center justify-end gap-2">
              {onShare ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Share wishlist"
                  onPress={onShare}
                  className="size-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
                >
                  <Icon as={Share2} className="size-4 text-text" />
                </AnimatedPressable>
              ) : null}

              {isOwner && onManageAccess ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage wishlist access"
                  onPress={onManageAccess}
                  className="size-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
                >
                  <Icon as={KeyRound} className="size-4 text-text" />
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
