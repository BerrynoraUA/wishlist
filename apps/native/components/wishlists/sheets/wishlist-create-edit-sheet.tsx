import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  BottomSheet,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { useUserGuideStepCompletion } from "@/components/user-guide/user-guide-provider";
import { USER_GUIDE_STEP_IDS } from "@/components/user-guide/user-guide-config";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  PeopleAvatar,
  PeoplePickerField,
  type PeoplePickerItem,
} from "@/components/ui/people-picker";
import { SingleImagePicker } from "@/components/ui/single-image-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { useCreateWishlist, useMyStatistics, useUpdateWishlist } from "@/hooks/use-wishlists";
import { useProGate } from "@/hooks/use-pro-gate";
import {
  EMPTY_WISHLIST_FORM,
  getWishlistAccentOptions,
  getWishlistVisibilityOptions,
  getWishlistAccentClass,
  toWishlistFormValues,
  WISHLIST_GROUP_ICON,
  type WishlistVisibilityOption,
} from "@/lib/wishlists";
import type { TranslateFn } from "@/lib/translate-fn";
import { cn } from "@/lib/utils";
import { useImageUploadField } from "@/lib/image-upload";
import { motionDuration } from "@/lib/motion";
import {
  SlidingOptionSelector,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import type { WishlistAccessUser } from "@wishlist/backend/types/friends";
import {
  WishlistAccent,
  WishlistVisibility,
  type Wishlist,
  type WishlistFormValues,
} from "@wishlist/backend/types/wishlist";
import { FREE_LIMITS } from "@wishlist/backend/types/subscription";
import { CalendarDays, Lock, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  useWishlistSelectedAccess,
  type SelectedAccessTarget,
} from "./use-wishlist-selected-access";

type VisibilitySelectorValue =
  | "private"
  | "selected-friends"
  | "selected-groups"
  | "friends"
  | "public";

const DESCRIPTION_INPUT_MIN_HEIGHT = 96;
const DESCRIPTION_INPUT_MAX_HEIGHT = 192;
const DESCRIPTION_INPUT_VERTICAL_OFFSET = 12;

function clampDescriptionInputHeight(height: number) {
  return Math.max(
    DESCRIPTION_INPUT_MIN_HEIGHT,
    Math.min(DESCRIPTION_INPUT_MAX_HEIGHT, Math.ceil(height)),
  );
}

function estimateDescriptionInputHeight(value: string | null | undefined) {
  const description = value ?? "";
  if (!description.trim()) return DESCRIPTION_INPUT_MIN_HEIGHT;

  const estimatedLineCount = description
    .split("\n")
    .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 34)), 0);

  return clampDescriptionInputHeight(estimatedLineCount * 22 + DESCRIPTION_INPUT_VERTICAL_OFFSET);
}

export function WishlistCreateEditSheet({
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
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const t = useGT();
  const { isGated, openPaywall } = useProGate();
  const completeCreateWishlistStep = useUserGuideStepCompletion(USER_GUIDE_STEP_IDS.createWishlist);
  const visibilityOptions = React.useMemo(() => getWishlistVisibilityOptions(t), [t]);
  const accentOptions = React.useMemo(() => getWishlistAccentOptions(t), [t]);
  const createMutation = useCreateWishlist();
  const updateMutation = useUpdateWishlist();
  const statisticsQuery = useMyStatistics();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const { control, handleSubmit, reset, setValue } = useForm<WishlistFormValues>({
    defaultValues: EMPTY_WISHLIST_FORM,
  });
  // Watch per field rather than the whole form: a bare `useWatch({ control })` re-renders
  // this sheet on every keystroke in the description too, which nothing here reads.
  const title = useWatch({ control, name: "title" });
  const visibility = useWatch({ control, name: "visibility" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const [descriptionInputHeight, setDescriptionInputHeight] = React.useState(
    DESCRIPTION_INPUT_MIN_HEIGHT,
  );
  const setSelectedAccessVisibility = React.useCallback(
    (visibility: WishlistVisibility) => setValue("visibility", visibility),
    [setValue],
  );
  const selectedAccess = useWishlistSelectedAccess({
    mode,
    open,
    wishlist,
    visibility,
    setVisibility: setSelectedAccessVisibility,
  });
  const imageUpload = useImageUploadField("wishlist");
  const canSubmit =
    !isPending && !selectedAccess.isSaving && !imageUpload.isUploading && title.trim() !== "";
  React.useEffect(() => {
    if (!open) return;

    const nextValues = toWishlistFormValues(wishlist);
    reset(
      mode === "create" && isGated ? { ...nextValues, accent: WishlistAccent.Pink } : nextValues,
    );
    imageUpload.reset();
    setDescriptionInputHeight(estimateDescriptionInputHeight(wishlist?.description));
  }, [imageUpload.reset, isGated, mode, open, reset, wishlist]);

  if (!open) return null;

  function handleClose() {
    if (!sheetRef.current) {
      onOpenChange(false);
      return;
    }

    void sheetRef.current.dismiss();
  }

  function patchValues(patch: Partial<WishlistFormValues>) {
    for (const [key, value] of Object.entries(patch)) {
      setValue(key as keyof WishlistFormValues, value as never);
    }
  }

  function handleVisibilityChange(
    visibility: WishlistFormValues["visibility"],
    selectedAccessTarget?: SelectedAccessTarget,
  ) {
    patchValues({ visibility });
    if (selectedAccessTarget) {
      selectedAccess.setTarget(selectedAccessTarget);
    }
  }

  async function submitForm(formValues: WishlistFormValues) {
    if (!canSubmit) return;
    if (
      mode === "create" &&
      isGated &&
      (statisticsQuery.data?.wishlists_count ?? 0) >= FREE_LIMITS.maxWishlists
    ) {
      openPaywall();
      return;
    }

    selectedAccess.setError(null);
    selectedAccess.setIsSaving(false);

    const imageUrl = await imageUpload.resolveImageUrl(formValues.imageUrl);
    if (imageUrl === undefined) return;

    const valuesToSave = { ...formValues, imageUrl: imageUrl ?? "" };

    try {
      if (mode === "edit" && wishlist) {
        await updateMutation.mutateAsync({ id: wishlist.id, values: valuesToSave });
        await imageUpload.commitPendingUpload(wishlist.image_url);
        await selectedAccess.syncAfterSave(wishlist.id, formValues.visibility);

        handleClose();
        return;
      }

      const createdWishlist = await createMutation.mutateAsync(valuesToSave);
      await imageUpload.commitPendingUpload();
      await selectedAccess.grantSelectedAccess(createdWishlist.id);
      completeCreateWishlistStep();
      handleClose();
    } catch (submitError) {
      await imageUpload.discardPendingUpload();
      selectedAccess.setError(
        submitError instanceof Error ? submitError.message : t("Could not save selected access."),
      );
    } finally {
      selectedAccess.setIsSaving(false);
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      detents={[0.75, 0.94]}
      footerInsetMode="scroll-content"
      onDidDismiss={() => onOpenChange(false)}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isPending}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <GuideTarget id="create-wishlist-submit" portalTooltipAnchor="footer" style={{ flex: 1 }}>
            <Button
              className="min-w-0 flex-1"
              disabled={!canSubmit}
              onPress={handleSubmit(submitForm)}
            >
              {isPending || selectedAccess.isSaving || imageUpload.isUploading ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Text>{mode === "edit" ? t("Save changes") : t("Create wishlist")}</Text>
            </Button>
          </GuideTarget>
        </View>
      }
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-5 pt-5"
      >
        <Field label={t("Name")}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <Input value={value} onChangeText={onChange} placeholder={t("Birthday gifts")} />
            )}
          />
        </Field>

        <Field label={t("Description (optional)")}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onFocus={() => {
                  void sheetRef.current?.resize(1);
                }}
                placeholder={t("A short note about this wishlist")}
                multiline
                onContentSizeChange={(event) => {
                  setDescriptionInputHeight(
                    clampDescriptionInputHeight(
                      event.nativeEvent.contentSize.height + DESCRIPTION_INPUT_VERTICAL_OFFSET,
                    ),
                  );
                }}
                className="items-start py-3"
                style={{ height: descriptionInputHeight }}
                textAlignVertical="top"
              />
            )}
          />
        </Field>

        <Field label={t("Visibility")}>
          <VisibilitySelector
            t={t}
            visibilityOptions={visibilityOptions}
            value={visibility}
            selectedAccessTarget={selectedAccess.target}
            onChange={handleVisibilityChange}
          />
          {selectedAccess.panelMounted ? (
            <Animated.View
              layout={LinearTransition.duration(motionDuration.normal)}
              className="gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-subtle p-3"
              style={selectedAccess.panelAnimatedStyle}
            >
              {selectedAccess.target === "friends" ? (
                <WishlistAccessPicker
                  title={t("Selected friends")}
                  addLabel={t("Add friends")}
                  options={selectedAccess.friendOptions}
                  selected={selectedAccess.selectedFriends}
                  onChange={(nextSelected) => {
                    selectedAccess.setSelectedFriends(nextSelected);
                    selectedAccess.setError(null);
                  }}
                  isLoading={
                    mode === "edit"
                      ? selectedAccess.friendsWithoutAccessLoading
                      : selectedAccess.friendsLoading
                  }
                  isError={
                    mode === "edit"
                      ? selectedAccess.friendsWithoutAccessError
                      : selectedAccess.friendsError
                  }
                  emptyLabel={
                    mode === "edit"
                      ? t("All available friends already have access.")
                      : t("No friends found yet.")
                  }
                  errorLabel={t("Could not load friends right now.")}
                  searchPlaceholder={t("Search friends")}
                  existingAccess={mode === "edit" ? selectedAccess.specificAccessList : []}
                  existingAccessTitle={mode === "edit" ? t("Already selected") : undefined}
                  existingAccessEmptyLabel={
                    selectedAccess.accessListLoading
                      ? t("Loading current access...")
                      : t("No selected friends yet.")
                  }
                  onRevokeAccess={
                    mode === "edit" ? selectedAccess.handleRevokeSpecificAccess : undefined
                  }
                  revokingTargetId={selectedAccess.revokeAccess.variables?.targetUserId ?? null}
                />
              ) : (
                <WishlistAccessPicker
                  title={t("Selected groups")}
                  addLabel={t("Add groups")}
                  options={selectedAccess.groupOptions}
                  selected={selectedAccess.selectedGroups}
                  onChange={(nextSelected) => {
                    selectedAccess.setSelectedGroups(nextSelected);
                    selectedAccess.setError(null);
                  }}
                  isLoading={
                    mode === "edit"
                      ? selectedAccess.groupsWithoutAccessLoading
                      : selectedAccess.groupsLoading
                  }
                  isError={
                    mode === "edit"
                      ? selectedAccess.groupsWithoutAccessError
                      : selectedAccess.groupsError
                  }
                  emptyLabel={
                    mode === "edit"
                      ? t("All available groups already have access.")
                      : t("No groups found yet.")
                  }
                  errorLabel={t("Could not load groups right now.")}
                  searchPlaceholder={t("Search groups")}
                  existingAccess={mode === "edit" ? selectedAccess.groupAccessList : []}
                  existingAccessTitle={mode === "edit" ? t("Already selected") : undefined}
                  existingAccessEmptyLabel={
                    selectedAccess.accessListLoading
                      ? t("Loading current access...")
                      : t("No selected groups yet.")
                  }
                  onRevokeAccess={
                    mode === "edit" ? selectedAccess.handleRevokeGroupAccess : undefined
                  }
                  revokingTargetId={selectedAccess.revokeGroupAccess.variables?.groupId ?? null}
                />
              )}
            </Animated.View>
          ) : null}
        </Field>

        <Field label={t("Accent")}>
          <Controller
            control={control}
            name="accent"
            render={({ field: { onChange, value } }) => (
              <AccentSelector
                accentOptions={accentOptions}
                value={value}
                onChange={(accent) => {
                  if (isGated && accent !== WishlistAccent.Pink) {
                    openPaywall();
                    return;
                  }
                  onChange(accent);
                }}
                isGated={isGated}
              />
            )}
          />
        </Field>

        <Field label={t("Event date (optional)")}>
          <Controller
            control={control}
            name="eventDate"
            render={({ field: { onChange, value } }) => (
              <EventDatePicker value={value} onChange={onChange} />
            )}
          />
        </Field>

        <Field label={t("Cover Image")}>
          <SingleImagePicker
            previewUri={imageUpload.pickedImage?.uri ?? imageUrl}
            aspect={[16, 9]}
            pickLabel={t("Choose cover image")}
            changeLabel={t("Change image")}
            onPick={(image) => {
              imageUpload.onPick(image);
            }}
            onClear={() => {
              imageUpload.onClear();
              patchValues({ imageUrl: "" });
            }}
            onError={imageUpload.onError}
          />
          {imageUpload.error ? (
            <Text className="text-xs font-semibold text-destructive">{imageUpload.error}</Text>
          ) : null}
        </Field>

        {error ? (
          <Text className="text-sm font-semibold text-destructive">{error.message}</Text>
        ) : null}
        {selectedAccess.error ? (
          <Text className="text-sm font-semibold text-destructive">{selectedAccess.error}</Text>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function VisibilitySelector({
  t,
  visibilityOptions,
  value,
  selectedAccessTarget,
  onChange,
}: {
  t: TranslateFn;
  visibilityOptions: WishlistVisibilityOption[];
  value: WishlistFormValues["visibility"];
  selectedAccessTarget: SelectedAccessTarget;
  onChange: (
    visibility: WishlistFormValues["visibility"],
    selectedAccessTarget?: SelectedAccessTarget,
  ) => void;
}) {
  const selectorValue: VisibilitySelectorValue =
    value === WishlistVisibility.SelectedFriends
      ? selectedAccessTarget === "groups"
        ? "selected-groups"
        : "selected-friends"
      : (visibilityOptions.find((option) => option.visibility === value)?.value ?? "friends");

  const rows = React.useMemo(() => {
    const privateOption = visibilityOptions[3];
    const selectedFriendsOption = visibilityOptions[2];
    const friendsOption = visibilityOptions[1];
    const publicOption = visibilityOptions[0];

    const orderedOptions: {
      value: VisibilitySelectorValue;
      label: string;
      icon: WishlistVisibilityOption["icon"];
      visibility: WishlistFormValues["visibility"];
      selectedAccessTarget?: SelectedAccessTarget;
    }[] = [
      {
        ...privateOption,
        value: "private",
      },
      {
        ...selectedFriendsOption,
        value: "selected-friends",
        selectedAccessTarget: "friends",
      },
      {
        value: "selected-groups",
        label: t("Selected groups"),
        icon: WISHLIST_GROUP_ICON,
        visibility: WishlistVisibility.SelectedFriends,
        selectedAccessTarget: "groups",
      },
      {
        ...friendsOption,
        value: "friends",
      },
      {
        ...publicOption,
        value: "public",
      },
    ];
    return orderedOptions;
  }, [t, visibilityOptions]);

  const selectedOption = rows.find((option) => option.value === selectorValue);
  const SelectedIcon = selectedOption?.icon;

  return (
    <Select
      value={
        selectedOption ? { value: selectedOption.value, label: selectedOption.label } : undefined
      }
      onValueChange={(nextValue) => {
        const nextOption = rows.find((option) => option.value === nextValue?.value);
        if (!nextOption) return;
        onChange(nextOption.visibility, nextOption.selectedAccessTarget);
      }}
    >
      <SelectTrigger className="h-12 rounded-lg border-border-subtle bg-bg-subtle">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {SelectedIcon ? <Icon as={SelectedIcon} className="size-4 text-text-muted" /> : null}
          <SelectValue className="min-w-0 flex-1" placeholder={t("Select visibility")} />
        </View>
      </SelectTrigger>
      <SelectContent>
        {rows.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            icon={option.icon}
          />
        ))}
      </SelectContent>
    </Select>
  );
}

function AccentSelector({
  accentOptions,
  value,
  onChange,
  isGated,
}: {
  accentOptions: ReturnType<typeof getWishlistAccentOptions>;
  value: WishlistFormValues["accent"];
  onChange: (accent: WishlistFormValues["accent"]) => void;
  isGated: boolean;
}) {
  const t = useGT();
  const rows = React.useMemo(() => {
    const options = accentOptions.map((option) => ({
      value: option.value,
      accessibilityLabel: t('Use "{label}" accent', { label: option.label }),
      surfaceClassName: "bg-transparent",
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View
            className={cn(
              "size-4 items-center justify-center rounded-full",
              getWishlistAccentClass(option.value),
              isGated && option.value !== WishlistAccent.Pink && "opacity-55",
            )}
          >
            {isGated && option.value !== WishlistAccent.Pink ? (
              <Icon as={Lock} className="size-2.5 text-white" />
            ) : null}
          </View>
          <Text
            className={cn("text-sm font-semibold text-text-muted", selected && "text-brand")}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </>
      ),
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, [accentOptions, isGated, t]);

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="gap-2 rounded-full px-3"
      indicatorClassName="rounded-full border border-brand bg-brand-lighter"
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
  const t = useGT();

  return (
    <DatePicker value={value || null} onChange={(nextValue) => onChange(nextValue ?? "")}>
      {({ displayValue, openPicker }) => (
        <View className="gap-2">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("Select event date")}
            onPress={openPicker}
            className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle px-3"
          >
            <Icon as={CalendarDays} className="size-4 text-text-muted" />
            <View className="min-w-0 flex-1">
              <Text className={cn("font-semibold", value ? "text-text" : "text-text-muted")}>
                {value ? displayValue : t("Select a date")}
              </Text>
              {value ? (
                <Text className="text-xs font-semibold text-text-muted">{value}</Text>
              ) : null}
            </View>
            {value ? (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("Clear event date")}
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
        </View>
      )}
    </DatePicker>
  );
}

function WishlistAccessPicker({
  title,
  addLabel,
  options,
  selected,
  onChange,
  isLoading,
  isError,
  emptyLabel,
  errorLabel,
  existingAccess = [],
  existingAccessTitle,
  existingAccessEmptyLabel,
  onRevokeAccess,
  revokingTargetId,
  searchPlaceholder,
}: {
  title: string;
  addLabel: string;
  options: PeoplePickerItem[];
  selected: PeoplePickerItem[];
  onChange: (options: PeoplePickerItem[]) => void;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  errorLabel: string;
  existingAccess?: WishlistAccessUser[];
  existingAccessTitle?: string;
  existingAccessEmptyLabel?: string;
  onRevokeAccess?: (targetId: string) => void;
  revokingTargetId?: string | null;
  searchPlaceholder: string;
}) {
  const t = useGT();
  const [query, setQuery] = React.useState("");

  return (
    <View className="gap-3">
      <PeoplePickerField
        label={title}
        title={addLabel}
        addLabel={addLabel}
        localFilter
        items={options}
        selected={selected}
        onChange={onChange}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        errorLabel={errorLabel}
        isLoading={isLoading}
        isError={isError}
      />

      {existingAccessTitle ? (
        <View className="gap-2 border-t border-border-subtle pt-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-xs font-bold uppercase text-text-muted">
              {existingAccessTitle}
            </Text>
            {existingAccess.length > 0 ? (
              <Text className="text-xs font-bold text-text-muted">{existingAccess.length}</Text>
            ) : null}
          </View>

          {existingAccess.length === 0 ? (
            <Text className="rounded-lg bg-bg-muted p-3 text-sm font-semibold text-text-muted">
              {existingAccessEmptyLabel}
            </Text>
          ) : (
            <View className="gap-2">
              {existingAccess.map((target) => {
                const revokeTargetId = target.group_id ?? target.id;
                const revoking = revokingTargetId === revokeTargetId;

                return (
                  <View
                    key={`${target.target_type ?? "user"}-${revokeTargetId}`}
                    className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-3"
                  >
                    {/* Same leading slot as the picker above, so a row that was just
                        granted access does not change shape once it moves down here. */}
                    <PeopleAvatar
                      className="size-8"
                      item={{
                        name: target.nickname,
                        group:
                          target.target_type === "group"
                            ? { icon: target.icon ?? "users", color: target.color ?? "pink" }
                            : undefined,
                      }}
                    />
                    <Text className="min-w-0 flex-1 font-semibold text-text">
                      {target.nickname}
                    </Text>
                    {onRevokeAccess ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        disabled={revoking}
                        accessibilityLabel={t("Remove access for {name}", {
                          name: target.nickname,
                        })}
                        onPress={() => onRevokeAccess(revokeTargetId)}
                      >
                        {revoking ? (
                          <ActivityIndicator colorClassName="accent-text-muted" />
                        ) : (
                          <Icon as={X} className="size-4 text-text-muted" />
                        )}
                      </Button>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
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
