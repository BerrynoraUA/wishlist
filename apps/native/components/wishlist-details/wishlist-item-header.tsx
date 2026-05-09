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
import { Text } from "@/components/ui/text";
import { usePatchWishlist } from "@/hooks/use-wishlists";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentClass,
  getWishlistVisibilityLabels,
  getWishlistVisibilityOptions,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import type { Wishlist, WishlistVisibility } from "@wishlist/backend/types/wishlist";
import {
  Calendar,
  ChevronDown,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

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
  topInset = 0,
}: {
  wishlist: Wishlist;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onManageAccess?: () => void;
  topInset?: number;
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
  const eventDate = wishlist.event_date;
  const canInlineEdit = isOwner;
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
    <View className="w-full self-stretch overflow-hidden border-b border-border-subtle">
      <View className={cn("absolute inset-0", getWishlistAccentClass(wishlist.accent_type))} />
      <View className="absolute inset-0 bg-black/20" />
      <View className="overflow-visible px-4 pb-4" style={{ paddingTop: topInset + 8 }}>
        <View className="gap-4">
          <View className="flex-row items-start gap-3">
            <View className="min-w-0 flex-1 gap-2">
              {onShare || (isOwner && onManageAccess) ? (
                <View className="flex-row items-center justify-end gap-2">
                  {onShare ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Share wishlist")}
                      onPress={onShare}
                      className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
                    >
                      <Icon as={Share2} className="size-4 text-white" />
                    </AnimatedPressable>
                  ) : null}

                  {isOwner && onManageAccess ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Manage wishlist access")}
                      onPress={onManageAccess}
                      className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
                    >
                      <Icon as={KeyRound} className="size-4 text-white" />
                    </AnimatedPressable>
                  ) : null}
                </View>
              ) : null}

              <View className="min-w-0">
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
                        className="h-11 rounded-xl border-white/50 bg-white/90 text-xl font-extrabold text-text"
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
                    <Text
                      className="text-[21px] font-extrabold leading-6 text-white"
                      numberOfLines={2}
                    >
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
                        className="mt-2 h-20 rounded-xl border-white/50 bg-white/90 text-sm text-text"
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
                    <Text className="mt-2 text-sm leading-5 text-white/80" numberOfLines={3}>
                      {wishlist.description || t("Add a short description")}
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          </View>

          <DatePicker
            value={eventDate}
            onChange={updateEventDate}
            iosContainerClassName="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
          >
            {({ displayValue, openPicker }) => (
              <View className="flex-row items-center justify-between gap-2">
                <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
                  {canInlineEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedPressable className="h-9 flex-row items-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
                          <Icon as={VisibilityIcon} className="size-3.5 text-white" />
                          <Text className="text-xs font-bold text-white">
                            {visibilityLabels[visibility]}
                          </Text>
                          <Icon as={ChevronDown} className="size-3 text-white/80" />
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
                    <View className="h-9 flex-row items-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
                      <Icon as={VisibilityIcon} className="size-3.5 text-white" />
                      <Text className="text-xs font-bold text-white">
                        {visibilityLabels[visibility]}
                      </Text>
                    </View>
                  )}

                  {eventDate || canInlineEdit ? (
                    eventDate && canInlineEdit ? (
                      <View
                        className={cn(
                          "flex-row items-center rounded-full border border-white/35 bg-white/25",
                          process.env.EXPO_OS === "android" ? "px-3" : "pl-3 pr-1",
                        )}
                      >
                        <AnimatedPressable
                          accessibilityRole="button"
                          accessibilityLabel={t("Wishlist event date")}
                          onPress={openPicker}
                          className={cn(
                            "h-9 flex-row items-center gap-1.5",
                            process.env.EXPO_OS !== "android" && "pr-2",
                          )}
                        >
                          <Icon as={Calendar} className="size-3.5 text-white" />
                          <Text className="text-xs font-bold text-white" numberOfLines={1}>
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
                            <Icon as={X} className="size-3.5 text-white/75" />
                          </AnimatedPressable>
                        ) : null}
                      </View>
                    ) : (
                      <AnimatedPressable
                        accessibilityRole={canInlineEdit ? "button" : "text"}
                        accessibilityLabel={eventDate ? t("Wishlist event date") : t("Add date")}
                        onPress={canInlineEdit ? openPicker : undefined}
                        className="h-9 flex-row items-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3"
                      >
                        <Icon as={Calendar} className="size-3.5 text-white" />
                        <Text className="text-xs font-bold text-white">
                          {eventDate ? displayValue : t("Add date")}
                        </Text>
                      </AnimatedPressable>
                    )
                  ) : null}
                </View>
                {onEdit || onDelete ? (
                  <View className="shrink-0 flex-row items-center justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedPressable
                          accessibilityRole="button"
                          accessibilityLabel={t("Wishlist actions")}
                          className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
                        >
                          <Icon as={MoreHorizontal} className="size-4 text-white" />
                        </AnimatedPressable>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-44">
                        {onEdit ? (
                          <DropdownMenuItem onPress={onEdit}>
                            <Icon as={Pencil} className="size-4 text-popover-foreground" />
                            <Text>{t("Edit")}</Text>
                          </DropdownMenuItem>
                        ) : null}
                        {onDelete ? (
                          <DropdownMenuItem
                            onPress={onDelete}
                            className="active:bg-danger-bg dark:active:bg-danger-bg/90"
                          >
                            <Icon as={Trash2} className="size-4 text-destructive" />
                            <Text className="text-destructive">{t("Delete")}</Text>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </View>
                ) : null}
              </View>
            )}
          </DatePicker>
        </View>
      </View>
    </View>
  );
}
