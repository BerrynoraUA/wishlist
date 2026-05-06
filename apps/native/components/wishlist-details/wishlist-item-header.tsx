import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { usePatchWishlist } from "@/hooks/use-wishlists";
import { getThemeMode } from "@/lib/theme";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistVisibilityLabels,
  getWishlistVisibilityOptions,
  getWishlistAccentGradientColors,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { LinearGradient } from "@/components/ui/linear-gradient";
import type { Wishlist, WishlistVisibility } from "@wishlist/backend/types/wishlist";
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
import { useGT } from "gt-react-native";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { useUniwind } from "uniwind";

type HeaderInlineFormValues = {
  title: string;
  description: string;
};

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
  const t = useGT();
  const visibilityLabels = React.useMemo(() => getWishlistVisibilityLabels(t), [t]);
  const visibilityOptions = React.useMemo(() => getWishlistVisibilityOptions(t), [t]);
  const patchWishlist = usePatchWishlist();
  const { control, getValues, setValue } = useForm<HeaderInlineFormValues>({
    defaultValues: {
      title: wishlist.title,
      description: wishlist.description ?? "",
    },
  });
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editingDescription, setEditingDescription] = React.useState(false);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const eventDate = wishlist.event_date;
  const canInlineEdit = isOwner;
  const { theme } = useUniwind();
  const mode = getThemeMode(theme);
  const accentGradientColors = getWishlistAccentGradientColors(wishlist.accent_type, mode);

  React.useEffect(() => {
    if (!editingTitle) setValue("title", wishlist.title);
  }, [editingTitle, setValue, wishlist.title]);

  React.useEffect(() => {
    if (!editingDescription) setValue("description", wishlist.description ?? "");
  }, [editingDescription, setValue, wishlist.description]);

  function saveTitle() {
    const nextTitle = getValues("title").trim();
    setEditingTitle(false);
    if (!nextTitle || nextTitle === wishlist.title || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { title: nextTitle } });
  }

  function saveDescription() {
    const nextDescription = getValues("description").trim();
    setEditingDescription(false);
    if (nextDescription === (wishlist.description ?? "") || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { description: nextDescription } });
  }

  function updateVisibility(nextVisibility: WishlistVisibility) {
    if (nextVisibility === wishlist.visibility_type || patchWishlist.isPending) return;
    patchWishlist.mutate({ id: wishlist.id, values: { visibility: nextVisibility } });
  }

  function updateEventDate(date: string | null) {
    if (patchWishlist.isPending) return;
    patchWishlist.mutate({
      id: wishlist.id,
      values: { eventDate: date },
    });
  }

  return (
    <View className="w-full self-stretch border-b border-border-subtle bg-gradient-header">
      <View className="overflow-visible px-4 py-4">
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <AnimatedPressable
              accessibilityRole={canInlineEdit ? "button" : "image"}
              accessibilityLabel={canInlineEdit ? t("Edit wishlist image") : wishlist.title}
              onPress={canInlineEdit ? onEdit : undefined}
              className="relative size-[70px] items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-white/70 shadow-lg"
            >
              <LinearGradient
                colors={accentGradientColors}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                className="absolute inset-0"
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
                  <Controller
                    control={control}
                    name="title"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        autoFocus
                        value={value}
                        onChangeText={onChange}
                        onBlur={saveTitle}
                        returnKeyType="done"
                        onSubmitEditing={saveTitle}
                        className="h-11 rounded-xl border-input-focus-border bg-card-bg text-xl font-extrabold"
                      />
                    )}
                  />
                ) : (
                  <AnimatedPressable
                    disabled={!canInlineEdit}
                    accessibilityRole={canInlineEdit ? "button" : "text"}
                    accessibilityLabel={canInlineEdit ? t("Edit wishlist title") : wishlist.title}
                    onPress={() => setEditingTitle(true)}
                  >
                    <Text className="text-xl font-extrabold leading-6 text-text" numberOfLines={2}>
                      {wishlist.title}
                    </Text>
                  </AnimatedPressable>
                )}

                {editingDescription ? (
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        autoFocus
                        value={value}
                        onChangeText={onChange}
                        onBlur={saveDescription}
                        multiline
                        className="mt-2 h-20 rounded-xl border-input-focus-border bg-card-bg text-sm"
                        textAlignVertical="top"
                      />
                    )}
                  />
                ) : wishlist.description || canInlineEdit ? (
                  <AnimatedPressable
                    disabled={!canInlineEdit}
                    accessibilityRole={canInlineEdit ? "button" : "text"}
                    accessibilityLabel={t("Edit wishlist description")}
                    onPress={() => setEditingDescription(true)}
                  >
                    <Text className="mt-2 text-sm leading-5 text-text-muted" numberOfLines={3}>
                      {wishlist.description || t("Add a short description")}
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>

              {onEdit || onDelete ? (
                <View className="items-center gap-2">
                  {onEdit ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Edit wishlist")}
                      onPress={onEdit}
                      className="size-8 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
                    >
                      <Icon as={Pencil} className="size-3.5 text-text" />
                    </AnimatedPressable>
                  ) : null}

                  {onDelete ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Delete wishlist")}
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

          <DatePicker
            value={eventDate}
            onChange={updateEventDate}
            iosContainerClassName="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
          >
            {({ displayValue, openPicker }) => (
              <View className="flex-row items-center gap-2">
                <View className="min-w-0 flex-1 flex-row flex-wrap items-center justify-around gap-2">
                  {canInlineEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedPressable className="h-8 flex-row items-center gap-1 rounded-full bg-brand-alpha-12 px-3">
                          <Icon as={VisibilityIcon} className="size-3.5 text-brand" />
                          <Text className="text-xs font-bold text-brand">
                            {visibilityLabels[visibility]}
                          </Text>
                          <Icon as={ChevronDown} className="size-3 text-brand" />
                        </AnimatedPressable>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-48">
                        {visibilityOptions.map((option) => (
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
                        {visibilityLabels[visibility]}
                      </Text>
                    </View>
                  )}

                  <View className="h-8 justify-center rounded-full bg-badge-count-bg px-3">
                    <Text className="text-xs font-bold text-text-muted">
                      {itemsCount === 1 ? t("1 item") : t("{count} items", { count: itemsCount })}
                    </Text>
                  </View>

                  {eventDate || canInlineEdit ? (
                    eventDate && canInlineEdit ? (
                      <View
                        className={cn(
                          "flex-row items-center rounded-full bg-info-bg",
                          process.env.EXPO_OS === "android" ? "px-3" : "pl-3 pr-1",
                        )}
                      >
                        <AnimatedPressable
                          accessibilityRole="button"
                          accessibilityLabel={t("Wishlist event date")}
                          onPress={openPicker}
                          className={cn(
                            "h-8 flex-row items-center gap-1",
                            process.env.EXPO_OS !== "android" && "pr-2",
                          )}
                        >
                          <Icon as={Calendar} className="size-3.5 text-info" />
                          <Text className="text-xs font-bold text-info" numberOfLines={1}>
                            {displayValue}
                          </Text>
                        </AnimatedPressable>
                        {process.env.EXPO_OS !== "android" ? (
                          <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel={t("Clear date")}
                            onPress={() => updateEventDate(null)}
                            className="size-8 items-center justify-center rounded-full"
                          >
                            <Icon as={X} className="size-3.5 text-text-muted" />
                          </AnimatedPressable>
                        ) : null}
                      </View>
                    ) : (
                      <AnimatedPressable
                        accessibilityRole={canInlineEdit ? "button" : "text"}
                        accessibilityLabel={eventDate ? t("Wishlist event date") : t("Add date")}
                        onPress={canInlineEdit ? openPicker : undefined}
                        className="h-8 flex-row items-center gap-1 rounded-full bg-info-bg px-3"
                      >
                        <Icon as={Calendar} className="size-3.5 text-info" />
                        <Text className="text-xs font-bold text-info">
                          {eventDate ? displayValue : t("Add date")}
                        </Text>
                      </AnimatedPressable>
                    )
                  ) : null}
                </View>
              </View>
            )}
          </DatePicker>

          {onShare || (isOwner && onManageAccess) ? (
            <View className="flex-row items-center justify-end gap-2">
              {onShare ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Share wishlist")}
                  onPress={onShare}
                  className="size-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
                >
                  <Icon as={Share2} className="size-4 text-text" />
                </AnimatedPressable>
              ) : null}

              {isOwner && onManageAccess ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Manage wishlist access")}
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
